'use client';

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

const MODELS = [
    { value: 'google/gemini-2.5-flash', label: 'Gemini Flash (Free)', badge: 'FREE' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet (Paid)', badge: 'PAID' },
];

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-2">
            <label htmlFor="model-select" className="text-xs text-slate-400 whitespace-nowrap">
                AI Model:
            </label>
            <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="flex-1 bg-slate-800/80 text-slate-200 text-xs rounded-lg px-3 py-1.5
                   border border-slate-700/50 focus:border-cyan-500/50 focus:outline-none
                   focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
            >
                {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                        {m.label} [{m.badge}]
                    </option>
                ))}
            </select>
        </div>
    );
}
