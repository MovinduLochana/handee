export function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}
