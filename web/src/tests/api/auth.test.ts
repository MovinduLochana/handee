import { describe, it, expect, vi, beforeEach } from "vitest";
import { authApi } from "../../api/auth";
import { api } from "../../lib/api";
import { clearTokens, setTokens } from "../../lib/tokenManager";

// Mock the imported modules
vi.mock("../../lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("../../lib/tokenManager", () => ({
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should send credentials and successfully persist tokens", async () => {
      const mockResponse = { data: { accessToken: "access-123", refreshToken: "refresh-456" } };
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const payload = { email: "test@example.com", password: "password123" };
      const result = await authApi.login(payload);

      expect(api.post).toHaveBeenCalledWith("/auth/login", payload);
      expect(setTokens).toHaveBeenCalledWith("access-123", "refresh-456");
      expect(result).toEqual(mockResponse.data);
    });

    it("should correctly handle login failures", async () => {
      const error = new Error("Invalid credentials");
      vi.mocked(api.post).mockRejectedValueOnce(error);

      await expect(authApi.login({ email: "x", password: "y" })).rejects.toThrow(
        "Invalid credentials",
      );
      expect(setTokens).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    it("should post correctly to /auth/register", async () => {
      const mockUser = { id: "user-123", role: "Customer" };
      vi.mocked(api.post).mockResolvedValueOnce({ data: mockUser });

      const payload = {
        fullName: "John Doe",
        email: "j@example.com",
        password: "pass",
        role: "Customer" as const,
      };
      const result = await authApi.register(payload);

      expect(api.post).toHaveBeenCalledWith("/auth/register", payload);
      expect(result).toEqual(mockUser);
    });
  });

  describe("logout", () => {
    it("should clear tokens natively and hit the /auth/logout endpoint", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({});

      await authApi.logout("refresh-789");

      expect(api.post).toHaveBeenCalledWith("/auth/logout", { refreshToken: "refresh-789" });
      expect(clearTokens).toHaveBeenCalled();
    });

    it("should still clear tokens natively even if the network call fails", async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error("Network error"));

      await expect(authApi.logout("refresh-789")).rejects.toThrow("Network error");
      expect(clearTokens).toHaveBeenCalled();
    });
  });
});
