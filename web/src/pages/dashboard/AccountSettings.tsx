import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Save } from 'lucide-react';

export default function AccountSettings() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (status !== 'idle') return;

        setStatus('saving');
        // Simulate network request providing a realistic subtle delay
        setTimeout(() => {
            setStatus('saved');
            // Revert button back to normal after 2.5s
            setTimeout(() => setStatus('idle'), 2500);
        }, 800);
    };

    return (
        <div style={{ maxWidth: '600px' }} className="animate-fade-up">
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '2.5rem', color: 'var(--text-h)', letterSpacing: '-0.03em' }}>Account Settings</h1>

            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--text-h)' }}>Personal Information</h2>

                <form onSubmit={handleSave}>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="settings-name" style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-h)' }}>Full Name</label>
                        <input id="settings-name" type="text" defaultValue="John Doe" style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '8px', border: '2px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', fontSize: '1rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxSizing: 'border-box' }} className="truncate" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label htmlFor="settings-email" style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-h)' }}>Email Address</label>
                        <input id="settings-email" type="email" defaultValue="john@example.com" style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '8px', border: '2px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', fontSize: '1rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxSizing: 'border-box' }} className="truncate" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label htmlFor="settings-notifications" style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-h)' }}>Notification Preferences</label>
                        <select id="settings-notifications" style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '8px', border: '2px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-h)', fontSize: '1rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', boxSizing: 'border-box' }}>
                            <option>Push & Email</option>
                            <option>Push Only</option>
                            <option>Email Only</option>
                            <option>None</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            padding: '1.125rem',
                            backgroundColor: status === 'saved' ? '#10b981' : 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            cursor: status === 'idle' ? 'pointer' : 'default',
                            transition: 'all 0.3s var(--ease-spring)',
                            boxShadow: status === 'saved' ? '0 4px 14px 0 rgba(16, 185, 129, 0.4)' : '0 4px 14px 0 rgba(37, 99, 235, 0.3)',
                            transform: status === 'saving' ? 'scale(0.98)' : 'scale(1)'
                        }}
                    >
                        {status === 'idle' && <><Save size={20} /> Save Changes</>}
                        {status === 'saving' && <><Loader2 size={20} className="animate-spin" /> Saving...</>}
                        {status === 'saved' && <><CheckCircle2 size={20} /> Settings Updated</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
