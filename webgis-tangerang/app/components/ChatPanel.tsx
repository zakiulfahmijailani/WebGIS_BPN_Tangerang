'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, MapPin, Navigation } from 'lucide-react';
import ModelSelector from './ModelSelector';
import type { FlyToCommand } from './MapLibreMap';

// ─── Known Locations for Zoom Commands ───
const KNOWN_LOCATIONS: { keywords: string[]; center: [number, number]; zoom: number; label: string }[] = [
    { keywords: ['kota tangerang', 'tangerang kota', 'tangerang city'], center: [106.63, -6.17], zoom: 13, label: 'Kota Tangerang' },
    { keywords: ['cipondoh'], center: [106.6253, -6.1893], zoom: 14, label: 'Cipondoh' },
    { keywords: ['karawaci'], center: [106.6150, -6.1760], zoom: 14, label: 'Karawaci' },
    { keywords: ['tangerang'], center: [106.63, -6.17], zoom: 13, label: 'Tangerang' },
    { keywords: ['benda'], center: [106.6517, -6.1425], zoom: 14, label: 'Benda' },
    { keywords: ['ciledug'], center: [106.7137, -6.2361], zoom: 14, label: 'Ciledug' },
    { keywords: ['pinang'], center: [106.6825, -6.2283], zoom: 14, label: 'Pinang' },
    { keywords: ['batuceper'], center: [106.6567, -6.1608], zoom: 14, label: 'Batuceper' },
    { keywords: ['neglasari'], center: [106.6383, -6.1500], zoom: 14, label: 'Neglasari' },
    { keywords: ['periuk'], center: [106.6167, -6.1567], zoom: 14, label: 'Periuk' },
    { keywords: ['jatiuwung'], center: [106.5917, -6.1967], zoom: 14, label: 'Jatiuwung' },
    { keywords: ['cibodas'], center: [106.6017, -6.1883], zoom: 14, label: 'Cibodas' },
    { keywords: ['larangan'], center: [106.7200, -6.2458], zoom: 14, label: 'Larangan' },
];

/**
 * Detect if the user message is a zoom/navigate command.
 * Returns a FlyToCommand if matched, otherwise null.
 */
function detectMapCommand(text: string): FlyToCommand | null {
    const lower = text.toLowerCase().trim();
    // Match patterns like: "zoom in ke ...", "zoom ke ...", "pergi ke ...", "fly to ...", "navigate to ..."
    const zoomPatterns = /^(zoom\s*(in|out)?\s*(ke|to)|pergi\s+ke|fly\s+to|navigate\s+to|pindah\s+ke|lihat|arahkan\s+ke)\s+/i;
    if (!zoomPatterns.test(lower)) return null;

    // Try to match against known locations
    for (const loc of KNOWN_LOCATIONS) {
        for (const kw of loc.keywords) {
            if (lower.includes(kw)) {
                return { center: loc.center, zoom: loc.zoom, label: loc.label };
            }
        }
    }
    return null;
}

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
    featureCount?: number;
    timestamp: Date;
}

interface ChatResponse {
    text: string;
    geojson: any;
    style: any;
    hasData: boolean;
    hasStyle: boolean;
}

interface ChatPanelProps {
    sessionId: string;
    selectedModel: string;
    onModelChange: (model: string) => void;
    onChatResponse: (response: ChatResponse) => void;
    onMapCommand: (cmd: FlyToCommand) => void;
}

const QUICK_SUGGESTIONS = [
    "Tampilkan semua bangunan",
    "Kecamatan dengan bangunan terbanyak",
    "Data update terbaru",
    "Bangunan komersial di Cipondoh",
];

export default function ChatPanel({
    sessionId,
    selectedModel,
    onModelChange,
    onChatResponse,
    onMapCommand,
}: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'bot',
            text: '👋 Halo! Saya ChatbotGIS untuk Kota Tangerang. Tanya saya tentang bangunan, kecamatan, atau data spasial lainnya!\n\nContoh: "Tampilkan semua bangunan komersial di Cipondoh"',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const prompt = input.trim();
        if (!prompt || isLoading) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: prompt,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // ─── Check for map navigation command (client-side, no API call) ───
        const mapCmd = detectMapCommand(prompt);
        if (mapCmd) {
            const botMsg: Message = {
                id: `bot-${Date.now()}`,
                role: 'bot',
                text: `🗺️ Mengarahkan peta ke **${mapCmd.label}**...`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
            onMapCommand(mapCmd);
            return; // Skip API call entirely
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, sessionId, model: selectedModel }),
            });

            const data = await res.json();

            const botMsg: Message = {
                id: `bot-${Date.now()}`,
                role: 'bot',
                text: data.text || 'Tidak ada respons.',
                featureCount: data.featureCount || 0,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);

            // Update map with dual-output result
            onChatResponse(data);
        } catch (err) {
            console.error('Chat error:', err);
            const errorMsg: Message = {
                id: `err-${Date.now()}`,
                role: 'bot',
                text: '❌ Maaf, terjadi kesalahan saat memproses permintaan Anda.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'bot' && (
                            <div className="flex-none w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 
                              flex items-center justify-center mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-500/15 text-slate-800 rounded-2xl rounded-tr-sm'
                                : 'bg-white/90 text-slate-800 border border-white/50 rounded-2xl rounded-tl-sm'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.featureCount !== undefined && msg.featureCount > 0 && (
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200">
                                    <MapPin className="w-3 h-3 text-blue-500" />
                                    <span className="text-[10px] text-blue-600 font-medium">
                                        {msg.featureCount} fitur ditemukan
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-2 items-start">
                        <div className="flex-none w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 
                            flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-white/90 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 
                            border border-white/50 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span className="text-xs">Sedang memproses...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-none p-3 relative bg-transparent z-10 -mt-2">
                {/* Quick Suggestions */}
                {suggestionsOpen && (
                    <div className="flex flex-wrap gap-1 mb-2 px-1">
                        {QUICK_SUGGESTIONS.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(q); setSuggestionsOpen(false); }}
                                className="px-2.5 py-1 rounded-lg text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-100 transition-all"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
                <div className="glass px-2 py-2 flex items-center gap-2">
                    <button
                        onClick={() => setSuggestionsOpen(!suggestionsOpen)}
                        className="flex-none w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-blue-400 hover:text-blue-600 transition-all"
                        title="Quick Suggestions"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Tanya dengan gaya alami..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm text-slate-800 px-3 py-1 outline-none placeholder:text-slate-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="flex-none w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 
                                   flex items-center justify-center text-white transition-all shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
