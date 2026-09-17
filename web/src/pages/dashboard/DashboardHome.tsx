export default function DashboardHome() {
    return (
        <div>
            <h1 style={{ fontFamily: 'var(--heading)', marginBottom: '1.5rem' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text)', marginBottom: '2rem' }}>
                Welcome back to Handee. Here's a summary of recent activity.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div style={{ backgroundColor: 'var(--bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)', fontSize: '1rem' }}>Active Bookings</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 600, fontFamily: 'var(--heading)' }}>2</p>
                </div>
                <div style={{ backgroundColor: 'var(--bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)', fontSize: '1rem' }}>Pending Approvals</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 600, fontFamily: 'var(--heading)', color: '#eab308' }}>1</p>
                </div>
                <div style={{ backgroundColor: 'var(--bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-h)', fontSize: '1rem' }}>Unread Notifications</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: 600, fontFamily: 'var(--heading)', color: 'var(--accent)' }}>3</p>
                </div>
            </div>
        </div>
    );
}
