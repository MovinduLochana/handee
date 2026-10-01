import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../api/auth";
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

export default function RegisterProvider() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState("");

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      navigate("/login");
    },
    onError: (error: any) => {
      setAuthError(extractApiError(error, "Registration failed."));
    },
  });

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authApi.register({
        fullName: formData.get("fullName") as string,
        email,
        password,
        role: "Provider",
      });

      // Automatically log in using the newly created credentials
      await authApi.login({ email, password });

      // Navigate directly to the onboarding flow
      navigate("/provider/onboarding");
    } catch (error: any) {
      setAuthError(extractApiError(error, "Registration failed."));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md bg-card text-card-foreground border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="text-3xl font-black tracking-tight text-foreground">Handee</div>
          <CardTitle className="text-2xl font-bold tracking-tight">Join Handee as a Pro</CardTitle>
          <CardDescription>Grow your business with verified service leads.</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name (or Business Name)</Label>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="Acme Services"
                required
                disabled={registerMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="contact@example.com"
                required
                disabled={registerMutation.isPending}
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
                disabled={registerMutation.isPending}
              />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...
                </>
              ) : (
                "Register & Verify"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <div>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </div>
          <div>
            Looking for a service?{" "}
            <Link
              to="/register/customer"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign up as a Customer
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
