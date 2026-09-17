import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Award } from 'lucide-react';
import './Landing.css';

export default function Landing() {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="brand">Handee</div>
                <div className="nav-actions">
                    <Link to="/register/provider">Join as a Pro</Link>
                    <Link to="/login" className="login-link">Sign In</Link>
                </div>
            </nav>

            <main className="landing-hero">
                <h1 className="hero-title">Trusted Professionals for Every Job.</h1>
                <p className="hero-subtitle">
                    Whether it's an urgent repair or routine maintenance, Handee connects you with verified tradespeople across Sri Lanka at transparent, AI-estimated prices.
                </p>

                <div className="hero-actions">
                    <Link to="/register/customer" className="btn-hero-primary">Find a Professional</Link>
                    <Link to="/register/provider" className="btn-hero-secondary">Become a Provider</Link>
                </div>

                <div className="trust-badges">
                    <div className="trust-badge">
                        <ShieldCheck size={20} />
                        <span>Verified Experts</span>
                    </div>
                    <div className="trust-badge">
                        <Award size={20} />
                        <span>Transparent Pricing</span>
                    </div>
                    <div className="trust-badge">
                        <Clock size={20} />
                        <span>Fast Matching</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
