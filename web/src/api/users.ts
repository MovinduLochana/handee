import { api } from "../lib/api";

export interface UserProfileResult {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  phoneNumber?: string;
  profilePictureUrl?: string; // The URL representing the avatar location on the backend
}

export interface UpdateProfileCommand {
  fullName: string;
  phoneNumber?: string;
}

export const usersApi = {
  /**
   * Retrieves the authenticated user's detailed profile information globally.
   * Expected: 200 OK — UserProfileResult
   */
  async getProfile(): Promise<UserProfileResult> {
    const response = await api.get<UserProfileResult>("/users/me");
    return response.data;
  },

  /**
   * Updates the authenticated user's structural profile fields.
   * Expected: 204 No Content
   */
  async updateProfile(data: UpdateProfileCommand): Promise<void> {
    await api.put("/users/me", data);
  },

  /**
   * Transmits a binary image file acting as the user layout's explicit avatar.
   * Leverages FormData implicitly mapped against multipart/form-data.
   * Expected: 200 OK — { profilePictureUrl: string }
   */
  async uploadProfilePicture(file: File): Promise<{ profilePictureUrl: string }> {
    const formData = new FormData();
    // Must strictly match the `name="photo"` expected by the backend parser
    formData.append("photo", file);

    const response = await api.post<{ profilePictureUrl: string }>("/users/me/photo", formData, {
      headers: {
        // Axios handles multi-part boundary boundaries natively if omitted,
        // but it's explicit for FormData context.
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },
};
