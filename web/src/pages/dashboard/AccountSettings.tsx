import { useNavigate } from 'react-router-dom';

export default function AccountSettings() {
    const navigate = useNavigate();

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Settings saved!');
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h1 style={{ fontFamily: 'var(--heading)', marginBottom: '2rem' }}>Account Settings</h1>

            <div style={{ backgroundColor: 'var(--bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontFamily: 'var(--heading)' }}>Personal Information</h2>
                <form onSubmit={handleSave}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Full Name</label>
                        <input type="text" defaultValue="John Doe" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Email Address</label>
                        <input type="email" defaultValue="john@example.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Notification Preferences</label>
                        <select style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                            <option>Push & Email</option>
                            <option>Push Only</option>
                            <option>Email Only</option>
                            <option>None</option>
                        </select>
                    </div>

                    <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--text-h)', color: 'var(--bg)', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}
