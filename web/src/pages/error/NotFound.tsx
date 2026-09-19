import React from 'react';
import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Error.css';

export default function NotFound() {
    return (
        <div className="error-container">
            <FileQuestion className="error-icon" />
            <h1 className="error-title">Page Not Found</h1>
            <p className="error-message">
                We couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
            </p>
            <Link to="/" className="error-action">Return Home</Link>
        </div>
    );
}
