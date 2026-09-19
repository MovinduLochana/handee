import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Bell, Settings, Activity, LogOut } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import { getRefreshToken } from '../../lib/tokenManager';
import './AppShell.css';

export default function AppShell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const navigation = [
        { name: 'Dashboard', to: '/dashboard', icon: Home },
        { name: 'Notifications', to: '/notifications', icon: Bell },
        { name: 'Agent Workflow', to: '/admin/agent-workflow', icon: Activity },
        { name: 'Settings', to: '/account', icon: Settings },
    ];

    const { data: userProfile } = useQuery({
        queryKey: ['userProfile'],
        queryFn: usersApi.getProfile,
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
            navigate('/login');
        }
    });

    return (
        <div className="shell-container">
            <aside className="shell-sidebar">
                <div className="brand">Handee</div>
                <nav className="shell-nav">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.name}
                                to={item.to}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="icon" />
                                <span className="nav-text">{item.name}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            <div className="shell-main">
                <header className="shell-header">
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginRight: '1.5rem', gap: '0.75rem' }}>
                        {userProfile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="animate-fade-up">
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
                    </div>
                    <button
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: 'var(--bg-surface)',
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
                        {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                    </button>
                </header>
                <main className="shell-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
