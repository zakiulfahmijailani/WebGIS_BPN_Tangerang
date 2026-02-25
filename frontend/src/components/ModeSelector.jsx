import React from 'react';

const MODES = [
    { key: 'viewing', label: '👁 Viewing', icon: '👁' },
    { key: 'editing', label: '✏️ Editing', icon: '✏️' },
    { key: 'reporting', label: '📤 Reporting', icon: '📤' },
];

export default function ModeSelector({ activeMode, onModeChange }) {
    return (
        <div className="mode-selector">
            {MODES.map(m => (
                <button
                    key={m.key}
                    className={`mode-btn ${activeMode === m.key ? 'active' : ''}`}
                    onClick={() => onModeChange(m.key)}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
}
