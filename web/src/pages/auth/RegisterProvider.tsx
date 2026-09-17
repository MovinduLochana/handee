import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { extractApiError } from '../../lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function RegisterProvider() {
    const navigate = useNavigate();
    const [authError, setAuthError] = useState('');

    const registerMutation = useMutation({
        mutationFn: authApi.register,
        onSuccess: () => {
            navigate('/login');
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
            role: 'Provider',
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="brand">Handee</div>
                <h2>Join Handee as a Pro</h2>
                <p className="subtitle">Grow your business with verified service leads.</p>

                {authError && (
                    <div style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 500 }} className="animate-fade-up">
                        <AlertCircle size={20} />
                        <div>{authError}</div>
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name (or Business Name)</label>
                        <input type="text" id="fullName" name="fullName" placeholder="Acme Services" required disabled={registerMutation.isPending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input type="email" id="email" name="email" placeholder="contact@example.com" required disabled={registerMutation.isPending} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" name="password" placeholder="••••••••" required disabled={registerMutation.isPending} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={registerMutation.isPending} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {registerMutation.isPending ? <><Loader2 size={20} className="animate-spin" /> Registering...</> : 'Register & Verify'}
                    </button>
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
