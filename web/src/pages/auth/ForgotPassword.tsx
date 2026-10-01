import React, { useState } from "react";
import { Link } from "react-router-dom";
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

export default function ForgotPassword() {
  const [authError, setAuthError] = useState("");
  const [isSent, setIsSent] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setIsSent(true);
      setAuthError("");
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Failed to process request."));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    forgotPasswordMutation.mutate(formData.get("email") as string);
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg text-center">
          <CardHeader className="space-y-2">
            <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
            <CardTitle className="text-2xl font-bold tracking-tight">Check your inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center text-primary">
              <CheckCircle2 className="h-14 w-14" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-sm">
              If an account exists for that email, we've sent a password reset link.
            </p>
            <Button asChild className="w-full mt-4">
              <Link to="/login">Back to log in</Link>
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
          <CardTitle className="text-2xl font-bold tracking-tight">Reset your password</CardTitle>
          <CardDescription>Enter your email address to receive a recovery link.</CardDescription>
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
              <Label htmlFor="email">Email address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="name@example.com"
                required
                disabled={forgotPasswordMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-2"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <div>
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
