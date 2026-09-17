import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Error.css';

export default function Unauthorized() {
    return (
        <div className="error-container">
            <ShieldAlert className="error-icon" />
            <h1 className="error-title">Access Denied</h1>
            <p className="error-message">
                You do not have the required permissions to view this page. If you believe this is a mistake, please contact support.
            </p>
            <Link to="/" className="error-action">Return Home</Link>
        </div>
    );
}
