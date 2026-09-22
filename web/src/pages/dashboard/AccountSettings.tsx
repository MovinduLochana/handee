import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { CheckCircle2, Loader2, Save, Camera } from "lucide-react";

export default function AccountSettings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Hydrate form strictly with cached network identity
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: usersApi.getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: () => {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: () => {
      setStatus("idle");
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: usersApi.uploadProfilePicture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadPhotoMutation.mutate(e.target.files[0]);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== "idle") return;

    setStatus("saving");
    const formData = new FormData(e.currentTarget);
    updateProfileMutation.mutate({
      fullName: formData.get("fullName") as string,
      phoneNumber: formData.get("phoneNumber") as string,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px" }} className="animate-fade-up">
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "2.5rem",
          color: "var(--text-h)",
          letterSpacing: "-0.03em",
        }}
      >
        Account Settings
      </h1>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "clamp(1.5rem, 5vw, 3rem)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Avatar Upload Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            marginBottom: "2.5rem",
            paddingBottom: "2.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ position: "relative" }}>
            {uploadPhotoMutation.isPending ? (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-surface-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                }}
              >
                <Loader2 size={24} className="animate-spin" color="var(--accent)" />
              </div>
            ) : userProfile?.profilePictureUrl ? (
              <img
                src={
                  userProfile.profilePictureUrl.startsWith("http")
                    ? userProfile.profilePictureUrl
                    : `http://localhost:5057${userProfile.profilePictureUrl}`
                }
                alt="Profile Avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "#fff",
                  fontSize: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {userProfile?.fullName?.charAt(0)}
              </div>
            )}

            {/* File picker button overlap */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPhotoMutation.isPending}
              style={{
                position: "absolute",
                bottom: -5,
                right: -5,
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              className="hover-lift"
              title="Upload profile picture"
              aria-label="Upload profile picture"
            >
              <Camera size={14} color="var(--text)" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--text-h)",
                marginBottom: "0.25rem",
              }}
            >
              Profile Picture
            </h3>
            <p className="field-desc" style={{ maxWidth: "300px" }}>
              Upload a new avatar supporting JPEG or PNG format. Max size 2MB.
            </p>
          </div>
        </div>

        <h2
          style={{
            fontSize: "1.25rem",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            color: "var(--text-h)",
          }}
        >
          Personal Information
        </h2>

        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="settings-name"
              style={{
                display: "block",
                fontSize: "0.95rem",
                marginBottom: "0.5rem",
                fontWeight: 600,
                color: "var(--text-h)",
              }}
            >
              Full Name
            </label>
            <input
              id="settings-name"
              name="fullName"
              type="text"
              defaultValue={userProfile?.fullName}
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--text-h)",
                fontSize: "1rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxSizing: "border-box",
              }}
              className="truncate"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="settings-email"
              style={{
                display: "block",
                fontSize: "0.95rem",
                marginBottom: "0.5rem",
                fontWeight: 600,
                color: "var(--text-h)",
              }}
            >
              Email Address (Read-Only)
            </label>
            <input
              id="settings-email"
              name="email"
              type="email"
              value={userProfile?.email || ""}
              readOnly
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--text-muted)",
                fontSize: "1rem",
                boxSizing: "border-box",
                opacity: 0.8,
              }}
              className="truncate"
            />
          </div>
          <div className="form-group" style={{ marginBottom: "2.5rem" }}>
            <label
              htmlFor="settings-phone"
              style={{
                display: "block",
                fontSize: "0.95rem",
                marginBottom: "0.5rem",
                fontWeight: 600,
                color: "var(--text-h)",
              }}
            >
              Phone Number
            </label>
            <input
              id="settings-phone"
              name="phoneNumber"
              type="tel"
              defaultValue={userProfile?.phoneNumber || ""}
              placeholder="+1 234 567 8900"
              style={{
                width: "100%",
                padding: "1rem 1.25rem",
                borderRadius: "8px",
                border: "2px solid var(--border)",
                backgroundColor: "var(--bg)",
                color: "var(--text-h)",
                fontSize: "1rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxSizing: "border-box",
              }}
              className="truncate"
            />
          </div>

          <button
            type="submit"
            disabled={status !== "idle" || updateProfileMutation.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "1.125rem",
              backgroundColor: status === "saved" ? "#10b981" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1.05rem",
              cursor: status === "idle" ? "pointer" : "default",
              transition: "all 0.3s var(--ease-spring)",
              boxShadow:
                status === "saved"
                  ? "0 4px 14px 0 rgba(16, 185, 129, 0.4)"
                  : "0 4px 14px 0 rgba(37, 99, 235, 0.3)",
              transform:
                status === "saving" || updateProfileMutation.isPending ? "scale(0.98)" : "scale(1)",
            }}
          >
            {status === "idle" && (
              <>
                <Save size={20} /> Save Changes
              </>
            )}
            {(status === "saving" || updateProfileMutation.isPending) && (
              <>
                <Loader2 size={20} className="animate-spin" /> Saving...
              </>
            )}
            {status === "saved" && (
              <>
                <CheckCircle2 size={20} /> Settings Updated
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
