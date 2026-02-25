import React from 'react';

export default function ChatWidget() {
    return (
        <div className="chat-widget">
            <div className="card-title">💬 AI Assistant</div>
            <span className="coming-soon">Coming Soon</span>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                Ask spatial questions about Tangerang buildings, districts, and land use.
            </p>
            <input
                className="chat-input-disabled"
                type="text"
                placeholder="Ask a spatial question..."
                disabled
            />
        </div>
    );
}
