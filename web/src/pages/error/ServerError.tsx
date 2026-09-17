import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Error.css';

export default function ServerError() {
    return (
        <div className="error-container">
            <AlertOctagon className="error-icon" />
            <h1 className="error-title">Service Unavailable</h1>
            <p className="error-message">
                We're currently experiencing some technical difficulties. Our team has been notified. Please try again in a few moments.
            </p>
            <Link to="/" className="error-action">Return Home</Link>
        </div>
    );
}
