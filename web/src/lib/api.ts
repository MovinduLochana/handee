import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenManager';

// Ideally injected via Vite ENV variables
export const BASE_URL = 'http://localhost:5057';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach access token to outgoing requests
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Token Rotation State
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle 401s uniquely for Token Refresh queuing
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Trigger Automatic Token Rotation if 401 occurs and it wasn't already a retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Bypass interceptor completely for authentication endpoints to prevent wiping out local UI states
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
                return Promise.reject(error);
            }

            // If a refresh is already in flight, queue this request
            if (isRefreshing) {
                try {
                    const token = await new Promise<string>((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    });
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                } catch (err) {
                    return Promise.reject(err);
                }
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();

            // If they strictly don't have a refresh token, instantly fail out
            if (!refreshToken) {
                clearTokens();
                // Only force redirect if they aren't already actively traversing an auth screen
                if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            try {
                // Hit the endpoint explicitly with standard axios (passing the refresh token)
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });

                setTokens(data.accessToken, data.refreshToken);

                // Unblock stalled requests natively
                processQueue(null, data.accessToken);

                // Re-attempt initial request safely
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return api(originalRequest);
            } catch (err) {
                processQueue(err as Error, null);
                clearTokens();
                // Force security demotion
                if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        // Proxy the precise error forward
        return Promise.reject(error);
    }
);

/**
 * Normalizes Axios/fetch Network exceptions extracting explicit ASP.NET Core strings cleanly for the UI.
 */
export function extractApiError(error: any, defaultMessage: string = 'Network operation failed'): string {
    if (!error || !error.response) {
        return error?.message || defaultMessage;
    }

    const data = error.response.data;

    // Sometimes APIs just return direct scalar strings (e.g. "Invalid credentials")
    if (typeof data === 'string' && data.length > 0) {
        return data;
    }

    // Standard ASP.NET Core ProblemDetails schema
    if (data?.detail) return data.detail;

    // ASP.NET Validation Errors Map Structure
    if (data?.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0];
        if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
            return data.errors[firstKey][0]; // Extract the very first validation problem listed uniquely
        }
    }

    if (data?.title) return data.title;
    if (data?.message) return data.message;

    return defaultMessage;
}
