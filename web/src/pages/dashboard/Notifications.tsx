import React from 'react';
import { BellDot, Inbox } from 'lucide-react';

export default function Notifications() {
    const notifications: any[] = [
        // Simulating an empty state for the delight workflow experience!
    ];

    return (
        <div style={{ maxWidth: '800px' }} className="animate-fade-up">
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '2.5rem', color: 'var(--text-h)', letterSpacing: '-0.03em' }}>Notifications</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map(n => (
                    <div key={n.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        backgroundColor: 'var(--bg-surface)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: `1px solid ${n.unread ? 'var(--accent-hover)' : 'var(--border)'}`,
                        borderLeft: n.unread ? '4px solid var(--accent)' : undefined,
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <BellDot size={24} style={{ color: n.unread ? 'var(--accent)' : 'var(--text)' }} />
                        <div>
                            <p style={{ margin: '0 0 0.5rem', fontWeight: n.unread ? 600 : 400, color: 'var(--text-h)' }}>{n.text}</p>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{n.time}</span>
                        </div>
                    </div>
                ))}

                {notifications.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4rem 2rem',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px dashed var(--border-strong)',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        animation: 'fadeUp 0.8s var(--ease-out-expo) 0.1s both'
                    }}>
                        <div style={{
                            backgroundColor: 'var(--bg)',
                            padding: '1.5rem',
                            borderRadius: '50%',
                            marginBottom: '1.5rem',
                            color: 'var(--border-strong)'
                        }}>
                            <Inbox size={48} strokeWidth={1.5} />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)', fontSize: '1.25rem', fontWeight: 600 }}>All caught up!</h3>
                        <p style={{ margin: 0, maxWidth: '300px', lineHeight: 1.5 }}>
                            Your dashboard is totally clear. When something needs your attention, it will appear right here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
