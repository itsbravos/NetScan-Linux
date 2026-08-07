import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, LogIn } from 'lucide-react';
import { ThemeMode } from '../types';

interface LoginScreenProps {
  themeMode: ThemeMode;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ themeMode, onLoginSuccess }) => {
  const isLight = themeMode === 'light';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Falha ao entrar.');
        return;
      }

      setPassword('');
      onLoginSuccess();
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 font-sans antialiased transition-colors duration-200 ${
      isLight ? 'bg-[#f8f6f0] text-slate-900' : 'bg-[#090d16] text-slate-100'
    }`}>
      <div className={`w-full max-w-sm p-8 border-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        isLight ? 'bg-white border-slate-900' : 'bg-slate-900 border-slate-700'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-sky-600 text-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">NetScan Linux</h1>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Painel protegido — informe a senha de administrador
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 ${
            isLight ? 'bg-slate-50 border-slate-900' : 'bg-slate-950 border-slate-700'
          }`}>
            <Lock className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-500'}`} />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de administrador"
              className={`flex-1 bg-transparent text-sm font-mono focus:outline-none ${
                isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-slate-100 placeholder:text-slate-600'
              }`}
            />
          </div>

          {error && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold ${
              isLight ? 'bg-rose-50 border-rose-600 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-200'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!password || isSubmitting}
            className={`w-full px-4 py-2.5 text-sm font-extrabold rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              !password || isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>

        <p className={`mt-5 text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          Na primeira execução, a senha é gerada automaticamente e impressa uma única vez no console do servidor. Para redefinir, apague <code>data/admin_auth.json</code> e reinicie.
        </p>
      </div>
    </div>
  );
};
