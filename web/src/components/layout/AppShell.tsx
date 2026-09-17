import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Bell, Settings, Activity } from 'lucide-react';
import './AppShell.css';

export default function AppShell() {
    // Note: These navigation elements will ideally be driven by the user's role later.
    // We provide the structural skeleton here.
    const navigation = [
        { name: 'Dashboard', to: '/dashboard', icon: Home },
        { name: 'Notifications', to: '/notifications', icon: Bell },
        { name: 'Agent Workflow', to: '/admin/agent-workflow', icon: Activity },
        { name: 'Settings', to: '/account', icon: Settings },
    ];

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
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            <div className="shell-main">
                <header className="shell-header">
                    {/* We can add profile dropdown or context aware items here later */}
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>Welcome to Handee</div>
                </header>
                <main className="shell-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
