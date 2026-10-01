import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { extractApiError } from "../../lib/api";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [authError, setAuthError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setIsSuccess(true);
      setAuthError("");
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Password reset failed."));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);

    resetPasswordMutation.mutate({
      email: email || "",
      token: token || "",
      newPassword: formData.get("password") as string,
    });
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg text-center">
          <CardHeader className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
            <CardTitle className="text-2xl font-bold tracking-tight">Invalid link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg text-center">
          <CardHeader className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
            <CardTitle className="text-2xl font-bold tracking-tight">Password Reset</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center text-primary">
              <CheckCircle2 className="h-14 w-14" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-sm">
              Your password has been successfully reset.
            </p>
            <Button asChild className="w-full mt-4">
              <Link to="/login">Log in to your account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create new password</CardTitle>
          <CardDescription>Enter a new password for {email}.</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                disabled={resetPasswordMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-2"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
