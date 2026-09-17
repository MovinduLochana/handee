import { api } from '../lib/api';
import { clearTokens, setTokens } from '../lib/tokenManager';

export interface RegisterPayload {
    fullName: string;
    email: string;
    password: string;
    role: 'Customer' | 'Provider';
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: 'Customer' | 'Provider' | 'Admin';
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

export const authApi = {
    /**
     * Registers a new account depending on the requested role.
     * Expected: 201 Created
     */
    async register(data: RegisterPayload): Promise<AuthUser> {
        const response = await api.post<AuthUser>('/auth/register', data);
        return response.data;
    },

    /**
     * Authenticates a user returning and persisting their short/long lived tokens.
     * Expected: 200 OK
     */
    async login(data: LoginPayload): Promise<TokenResponse> {
        const response = await api.post<TokenResponse>('/auth/login', data);

        // Automatically persist to localStorage preventing race conditions
        if (response.data.accessToken && response.data.refreshToken) {
            setTokens(response.data.accessToken, response.data.refreshToken);
        }

        return response.data;
    },

    /**
     * Securely revokes the current refresh token preventing replay attacks, and immediately clears local state.
     * Expected: 204 No Content
     */
    async logout(refreshToken: string): Promise<void> {
        try {
            await api.post('/auth/logout', { refreshToken });
        } finally {
            // Regardless of network state, the client must drop its state natively
            clearTokens();
        }
    }
};
