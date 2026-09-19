import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function RegisterProvider() {
    const navigate = useNavigate();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // Provider registration hands off to the verification workflow
        // Here we'll simulate progressing to dashboard/verification
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Join Handee as a Pro</h2>
                <p className="subtitle">Grow your business with verified service leads.</p>

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name (or Business Name)</label>
                        <input type="text" id="name" placeholder="Acme Services" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input type="email" id="email" placeholder="contact@example.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input type="tel" id="phone" placeholder="07XXXXXXXX" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn-primary">Register & Verify</button>
                </form>

                <div className="auth-links">
                    <div>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        Looking for a service? <Link to="/register/customer">Sign up as a Customer</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
