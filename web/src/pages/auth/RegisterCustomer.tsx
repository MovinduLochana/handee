import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { extractApiError } from '../../lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function RegisterCustomer() {
    const navigate = useNavigate();
    const [authError, setAuthError] = useState('');

    const registerMutation = useMutation({
        mutationFn: authApi.register,
        onSuccess: () => {
            navigate('/login'); // Natively redirect directly into authentication portal upon successful account creation
        },
        onError: (error: any) => {
            setAuthError(extractApiError(error, 'Registration failed.'));
        }
    });

    const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAuthError('');
        const formData = new FormData(e.currentTarget);
        registerMutation.mutate({
            fullName: formData.get('fullName') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: 'Customer',
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Create a Customer Account</h2>
                <p className="subtitle">Find and book verified professionals instantly.</p>

                {authError && (
                    <div style={{ backgroundColor: 'var(--bg-danger)', color: 'var(--text-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }} className="animate-fade-up">
                        <AlertCircle size={20} />
                        <div>{authError}</div>
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input type="text" id="fullName" name="fullName" placeholder="John Doe" required disabled={registerMutation.isPending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input type="email" id="email" name="email" placeholder="name@example.com" required disabled={registerMutation.isPending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="••••••••" required disabled={registerMutation.isPending} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={registerMutation.isPending} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {registerMutation.isPending ? <><Loader2 size={20} className="animate-spin" /> Registering...</> : 'Register'}
                    </button>
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
