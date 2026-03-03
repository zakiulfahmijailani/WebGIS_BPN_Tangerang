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
            text: '👋 Halo! Saya asisten WebGIS untuk Kota Tangerang. Tanya saya tentang bangunan, kecamatan, atau data spasial lainnya!\n\nContoh: "Tampilkan semua bangunan komersial di Cipondoh"',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
        <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm">
            {/* Header */}
            <div className="flex-none border-b border-slate-700/50">
                <div className="px-4 py-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 
                          flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">AI Spatial Chat</h2>
                        <p className="text-[10px] text-slate-400">PostGIS-powered queries</p>
                    </div>
                </div>
                <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
            </div>

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
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-lg ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-md'
                                : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-bl-md'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.featureCount !== undefined && msg.featureCount > 0 && (
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-600/30">
                                    <MapPin className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[10px] text-cyan-400 font-medium">
                                        {msg.featureCount} fitur ditemukan
                                    </span>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="flex-none w-7 h-7 rounded-full bg-slate-700 
                              flex items-center justify-center mt-0.5">
                                <User className="w-3.5 h-3.5 text-slate-300" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-2 items-start">
                        <div className="flex-none w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 
                            flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-slate-800/80 text-slate-300 rounded-2xl rounded-bl-md px-4 py-3 
                            border border-slate-700/50 shadow-lg">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                <span className="text-xs">🔍 Querying PostGIS...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-none p-3 border-t border-slate-700/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Tanyakan tentang data spasial..."
                        disabled={isLoading}
                        className="flex-1 bg-slate-800/80 text-sm text-white rounded-xl px-4 py-2.5
                       border border-slate-700/50 focus:border-cyan-500/50 focus:outline-none
                       focus:ring-1 focus:ring-cyan-500/30 placeholder-slate-500 transition-all
                       disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="flex-none w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                       flex items-center justify-center text-white shadow-lg shadow-cyan-500/20
                       hover:shadow-cyan-500/40 transition-all disabled:opacity-40 disabled:shadow-none
                       active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
