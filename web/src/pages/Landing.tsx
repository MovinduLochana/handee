import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Clock, Award, ArrowRight } from "lucide-react";
import { getRefreshToken } from "../lib/tokenManager";
import PublicNavbar from "../components/layout/PublicNavbar";
import "./Landing.css";

export default function Landing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getRefreshToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="landing-container">
      <PublicNavbar />

      <main className="landing-hero">
        <div className="hero-decoration"></div>
        <div className="hero-content">
          <h1 className="hero-title animate-fade-up">
            Trustworthy Service, <br />
            <span className="highlight">Instantly.</span>
          </h1>
          <p className="hero-subtitle animate-fade-up animate-delay-100">
            Handee connects you with verified tradespeople across Sri Lanka at transparent,
            AI-estimated prices. Skip the guesswork.
          </p>

          <div className="hero-actions animate-fade-up animate-delay-200">
            {isLoggedIn ? (
              <>
                <Link to="/providers" className="btn-hero-primary">
                  Find a Professional
                </Link>
                <Link to="/dashboard" className="btn-hero-secondary">
                  Access your Dashboard <ArrowRight size={20} />
                </Link>
              </>
            ) : (
              <>
                <Link to="/providers" className="btn-hero-primary">
                  Find a Professional
                </Link>
                <Link to="/register/provider" className="btn-hero-secondary">
                  Become a Provider <ArrowRight size={20} />
                </Link>
              </>
            )}
          </div>

          <div className="trust-badges animate-fade-up animate-delay-300">
            <div className="trust-badge">
              <ShieldCheck size={24} strokeWidth={2.5} />
              <span>100% Verified Experts</span>
            </div>
            <div className="trust-badge">
              <Award size={24} strokeWidth={2.5} />
              <span>Clear Pricing</span>
            </div>
            <div className="trust-badge">
              <Clock size={24} strokeWidth={2.5} />
              <span>Fast Matching</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
