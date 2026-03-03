'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import { Loader2, Navigation } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (data.session) {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-slate-100 overflow-hidden">
            {/* Background Map Texture Illusion */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)',
                    backgroundSize: '40px 40px',
                }}
            />
            {/* Soft Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] z-0 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px] z-0 pointer-events-none" />

            {/* Login Card */}
            <div className="glass w-full max-w-[420px] p-8 mx-4 relative z-10 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 mb-4">
                        <Navigation className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight text-center">
                        WebGIS BPN Tangerang
                    </h1>
                    <p className="text-sm font-medium text-blue-600 uppercase tracking-widest mt-1">
                        Spatial Intelligence
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg text-center">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/60 border border-slate-200/50 rounded-xl px-4 py-3 text-sm 
                                       text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                       focus:border-blue-500/50 transition-all backdrop-blur-sm"
                            placeholder="nama@bpn.go.id"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/60 border border-slate-200/50 rounded-xl px-4 py-3 text-sm 
                                       text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                       focus:border-blue-500/50 transition-all backdrop-blur-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white rounded-xl py-3 mt-6 text-sm font-semibold
                                   hover:bg-slate-800 transition-all flex items-center justify-center gap-2
                                   shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-slate-500 font-medium">
                    &copy; 2026 BPN Kota Tangerang. All rights reserved.
                </div>
            </div>
        </div>
    );
}
