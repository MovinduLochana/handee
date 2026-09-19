import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function ResetPassword() {
    const navigate = useNavigate();

    const handleReset = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Set New Password</h2>
                <p className="subtitle">Please enter your new password below.</p>

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <input type="password" id="password" placeholder="••••••••" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn-primary">Update Password</button>
                </form>

                <div className="auth-links">
                    <Link to="/login">Return to Sign In</Link>
                </div>
            </div>
        </div>
    );
}
