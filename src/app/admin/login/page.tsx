'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import Cookies from 'js-cookie';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch('/api/admin/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                Cookies.set('admin_auth', 'true', { expires: 1 }); // 1 day session
                router.push('/admin');
            } else {
                setError(true);
            }
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600 mb-4">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Admin Access</h1>
                    <p className="text-slate-500 text-sm mt-1">Please enter the password to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password (默认: admin)"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                        />
                        <p className="text-xs text-slate-400 mt-2 text-right">默认密码: admin</p>
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs text-center font-medium">
                            Incorrect password. Please try again.
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                        Access Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
}
