import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Clock, Award, ArrowRight } from "lucide-react";
import { getRefreshToken } from "../lib/tokenManager";
import PublicNavbar from "../components/layout/PublicNavbar";
import { buttonVariants } from "@/components/ui/button";

export default function Landing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getRefreshToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-4xl mx-auto">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Trustworthy Service, <br />
            <span className="text-primary underline decoration-primary decoration-4 underline-offset-8">
              Instantly.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Handee connects you with verified tradespeople across Sri Lanka at transparent,
            AI-estimated prices. Skip the guesswork.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isLoggedIn ? (
              <>
                <Link
                  to="/providers"
                  className={buttonVariants({
                    size: "lg",
                    className: "w-full sm:w-auto px-8 py-6 text-base",
                  })}
                >
                  Find a Professional
                </Link>
                <Link
                  to="/dashboard"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "w-full sm:w-auto px-8 py-6 text-base gap-2",
                  })}
                >
                  Access your Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/providers"
                  className={buttonVariants({
                    size: "lg",
                    className: "w-full sm:w-auto px-8 py-6 text-base",
                  })}
                >
                  Find a Professional
                </Link>
                <Link
                  to="/register/provider"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "w-full sm:w-auto px-8 py-6 text-base gap-2",
                  })}
                >
                  Become a Provider <ArrowRight className="w-5 h-5" />
                </Link>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto border-t border-border mt-12">
            <div className="flex items-center justify-center gap-3 p-4 bg-card border border-border">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-foreground">100% Verified Experts</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 bg-card border border-border">
              <Award className="w-6 h-6 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Clear Pricing</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 bg-card border border-border">
              <Clock className="w-6 h-6 text-blue-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Fast Matching</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
