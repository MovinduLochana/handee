import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function RegisterCustomer() {
    const navigate = useNavigate();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // After registration, customer likely gets redirected to login or directly to dashboard
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Create a Customer Account</h2>
                <p className="subtitle">Find and book verified professionals instantly.</p>

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input type="text" id="name" placeholder="John Doe" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input type="email" id="email" placeholder="name@example.com" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input type="tel" id="phone" placeholder="07XXXXXXXX" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" placeholder="••••••••" required />
                    </div>
                    <button type="submit" className="btn-primary">Register</button>
                </form>

                <div className="auth-links">
                    <div>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        Are you a service provider? <Link to="/register/provider">Join as a Pro</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
