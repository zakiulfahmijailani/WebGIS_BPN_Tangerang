import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (username === 'admin' && password === 'admin123') {
            onLogin(true);
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-icon">🗺️</div>
                <h1>WebGIS Tangerang</h1>
                <p>Cadastral Analytics Dashboard</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoFocus
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                        />
                    </div>
                    <button type="submit" className="login-btn">Sign In</button>
                </form>
                {error && <div className="login-error">{error}</div>}
            </div>
        </div>
    );
}
