import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../api/users";
import { getFullMediaUrl } from "../../lib/api";
import { CheckCircle2, Loader2, Save, Camera } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Account Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal details and contact information.
        </p>
      </div>

      <Card className="bg-card text-card-foreground border-border shadow-xs">
        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Avatar Upload Container */}
          <div className="flex items-center gap-6 pb-6 border-b border-border">
            <div className="relative">
              {uploadPhotoMutation.isPending ? (
                <div className="h-20 w-20 flex items-center justify-center bg-muted border border-border">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                  {userProfile?.profilePictureUrl && (
                    <AvatarImage
                      src={getFullMediaUrl(userProfile.profilePictureUrl)}
                      alt="Profile Avatar"
                    />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl">
                    {userProfile?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* File picker button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhotoMutation.isPending}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm bg-background border-border"
                title="Upload profile picture"
                aria-label="Upload profile picture"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
              />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground mb-1">Profile Picture</h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Upload a new avatar supporting JPEG or PNG format. Max size 2MB.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <Input
                id="settings-name"
                name="fullName"
                type="text"
                defaultValue={userProfile?.fullName}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-email">Email Address (Read-Only)</Label>
              <Input
                id="settings-email"
                name="email"
                type="email"
                value={userProfile?.email || ""}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed opacity-80"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-phone">Phone Number</Label>
              <Input
                id="settings-phone"
                name="phoneNumber"
                type="tel"
                defaultValue={userProfile?.phoneNumber || ""}
                placeholder="+1 234 567 8900"
              />
            </div>

            <Button
              type="submit"
              disabled={status !== "idle" || updateProfileMutation.isPending}
              className={`w-full h-11 text-sm font-semibold transition-all ${
                status === "saved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              }`}
            >
              {status === "idle" && (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" /> Save Changes
                </span>
              )}
              {(status === "saving" || updateProfileMutation.isPending) && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </span>
              )}
              {status === "saved" && (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Settings Updated
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
