import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, Award, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRefreshToken } from '../lib/tokenManager';
import { usersApi } from '../api/users';
import { authApi } from '../api/auth';
import './Landing.css';

export default function Landing() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Hydrate logged in state strictly on mount preventing SSR/hydration mismatches if ported to SSR later
        const token = getRefreshToken();
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    // Optionally fetch dynamic profile variables if authenticated gracefully
    const { data: userProfile } = useQuery({
        queryKey: ['userProfile'],
        queryFn: usersApi.getProfile,
        enabled: isLoggedIn, // Explicitly prevent global 401 unauthenticated requests from throwing
        retry: false
    });

    const logoutMutation = useMutation({
        mutationFn: () => {
            const token = getRefreshToken();
            if (!token) return Promise.resolve();
            return authApi.logout(token);
        },
        onSettled: () => {
            queryClient.clear();
            setIsLoggedIn(false);
            navigate('/login');
        }
    });

    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="brand">Handee</div>
                <div className="nav-actions">
                    {isLoggedIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {userProfile && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem' }} className="animate-fade-up">
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.25rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-h)' }}>{userProfile.fullName}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{userProfile.roles?.[0] || 'Member'}</div>
                                    </div>
                                    {userProfile.profilePictureUrl ? (
                                        <img
                                            src={userProfile.profilePictureUrl.startsWith('http') ? userProfile.profilePictureUrl : `http://localhost:5057${userProfile.profilePictureUrl}`}
                                            alt="Avatar"
                                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                                        />
                                    ) : (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            {userProfile.fullName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link to="/dashboard" className="login-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                                <LayoutDashboard size={18} /> Dashboard
                            </Link>

                            <button
                                onClick={() => logoutMutation.mutate()}
                                disabled={logoutMutation.isPending}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-h)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    cursor: logoutMutation.isPending ? 'default' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s var(--ease-spring)',
                                    opacity: logoutMutation.isPending ? 0.6 : 1
                                }}
                                className="hover-lift"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link to="/register/provider">Join as a Pro</Link>
                            <Link to="/login" className="login-link">Sign In</Link>
                        </>
                    )}
                </div>
            </nav>

            <main className="landing-hero">
                <div className="hero-decoration"></div>
                <div className="hero-content">
                    <h1 className="hero-title animate-fade-up">
                        Trustworthy Service, <br />
                        <span className="highlight">Instantly.</span>
                    </h1>
                    <p className="hero-subtitle animate-fade-up animate-delay-100">
                        Handee connects you with verified tradespeople across Sri Lanka at transparent, AI-estimated prices. Skip the guesswork.
                    </p>

                    <div className="hero-actions animate-fade-up animate-delay-200">
                        {isLoggedIn ? (
                            <Link to="/dashboard" className="btn-hero-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                Access your Dashboard <ArrowRight size={20} />
                            </Link>
                        ) : (
                            <>
                                <Link to="/register/customer" className="btn-hero-primary">
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
