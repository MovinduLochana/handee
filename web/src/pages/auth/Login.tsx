import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
import { usersApi } from "../../api/users";
import { extractApiError } from "../../lib/api";
import { Loader2, AlertCircle } from "lucide-react";
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

export default function Login() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (credentials: any) => authApi.login(credentials),
    onSuccess: async () => {
      try {
        // Fetch profile to determine role
        const profile = await usersApi.getProfile();
        if (profile.roles.includes("Customer")) {
          navigate("/providers");
        } else {
          navigate("/dashboard");
        }
      } catch {
        // Fallback if profile fetch fails
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Invalid credentials."));
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="name@example.com"
                required
                disabled={loginMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                disabled={loginMutation.isPending}
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <Link
            to="/forgot-password"
            className="hover:text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
          <div>
            Don't have an account?{" "}
            <Link
              to="/register/customer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Register
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
