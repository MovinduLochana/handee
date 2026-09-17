import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Bell, Settings, Activity, LogOut } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { getRefreshToken } from '../../lib/tokenManager';
import './AppShell.css';

export default function AppShell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Default structure for AppShell routing hooks
    const navigation = [
        { name: 'Dashboard', to: '/dashboard', icon: Home },
        { name: 'Notifications', to: '/notifications', icon: Bell },
        { name: 'Agent Workflow', to: '/admin/agent-workflow', icon: Activity },
        { name: 'Settings', to: '/account', icon: Settings },
    ];

    const logoutMutation = useMutation({
        mutationFn: () => {
            const token = getRefreshToken();
            // If they implicitly lack a refresh token, immediately resolve
            if (!token) return Promise.resolve();
            return authApi.logout(token);
        },
        onSettled: () => {
            // Ensure all cached frontend sensitive data is nuked from memory
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
