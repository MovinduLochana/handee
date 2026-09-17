import { BellDot } from 'lucide-react';

export default function Notifications() {
    const notifications = [
        { id: 1, text: "Your booking for 'AC Repair' was accepted by Acme Services.", time: "2 mins ago", unread: true },
        { id: 2, text: "A new invoice is available for your recent booking.", time: "1 hour ago", unread: false },
        { id: 3, text: "Your provider profile has been verified successfully.", time: "1 day ago", unread: false },
    ];

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontFamily: 'var(--heading)', marginBottom: '2rem' }}>Notifications</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map(n => (
                    <div key={n.id} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        backgroundColor: 'var(--bg)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: `1px solid ${n.unread ? 'var(--accent-border)' : 'var(--border)'}`,
                        borderLeft: n.unread ? '4px solid var(--accent)' : undefined
                    }}>
                        <BellDot size={24} style={{ color: n.unread ? 'var(--accent)' : 'var(--text)' }} />
                        <div>
                            <p style={{ margin: '0 0 0.5rem', fontWeight: n.unread ? 600 : 400, color: 'var(--text-h)' }}>{n.text}</p>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{n.time}</span>
                        </div>
                    </div>
                ))}
                {notifications.length === 0 && <p>No new notifications.</p>}
            </div>
        </div>
    );
}
