import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

export default function ForgotPassword() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Reset your password</h2>

                {!submitted ? (
                    <>
                        <p className="subtitle">Enter your email address and we will send you a link to reset your password.</p>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input type="email" id="email" placeholder="name@example.com" required />
                            </div>
                            <button type="submit" className="btn-primary">Send Reset Link</button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                        <p style={{ color: 'var(--text-h)', fontWeight: 500, marginBottom: '1rem' }}>Check your email</p>
                        <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
                            We've sent a password reset link to your email address.
                        </p>
                    </div>
                )}

                <div className="auth-links">
                    <Link to="/login">← Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
}
