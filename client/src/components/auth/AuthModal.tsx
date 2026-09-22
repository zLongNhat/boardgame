import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Lock, LogIn, Sparkles, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

const AVATARS = [
  { id: 'av-fox', emoji: '🦊', label: 'Cáo Thông Thái' },
  { id: 'av-cat', emoji: '🐱', label: 'Mèo Cyber' },
  { id: 'av-robot', emoji: '🤖', label: 'Robo 3000' },
  { id: 'av-dragon', emoji: '🐉', label: 'Rồng Lửa' },
  { id: 'av-wizard', emoji: '🧙', label: 'Phù Thủy' },
  { id: 'av-ninja', emoji: '🥷', label: 'Ninja Bóng Đêm' },
  { id: 'av-tiger', emoji: '🐯', label: 'Hổ Quyền' },
  { id: 'av-bear', emoji: '🐻', label: 'Gấu Bão Tuyết' }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const { login, register } = useAuth();
  const { t } = useLang();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      if (!username.trim() || !password) {
        setError(t('auth.required'));
        return;
      }

      setLoading(true);
      const res = await login(username.trim(), password, remember);
      setLoading(false);

      if (res.success) {
        setSuccessMsg(t('auth.loginOk'));
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else {
        setError(res.message || t('auth.loginFail'));
      }
    } else {
      // Register validation
      if (!username.trim() || !password || !displayName.trim()) {
        setError(t('auth.allFields'));
        return;
      }
      if (username.trim().length < 3) {
        setError(t('auth.userShort'));
        return;
      }
      if (password.length < 6) {
        setError(t('auth.passShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.passMismatch'));
        return;
      }

      setLoading(true);
      const res = await register(username.trim(), password, displayName.trim(), avatar);
      setLoading(false);

      if (res.success) {
        setSuccessMsg(t('auth.registerOk'));
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else {
        setError(res.message || t('auth.registerFail'));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Đóng (Chơi như Khách)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Tài Khoản Cao Thủ OmniDeck
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            {t('auth.loginTab')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t('auth.registerTab')}
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('auth.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.usernamePh')}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              autoComplete="username"
              required
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.displayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayPh')}
                maxLength={20}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.confirm')}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoComplete="new-password"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.avatarPick')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setAvatar(av.id)}
                    className={`h-11 flex items-center justify-center text-xl rounded-xl border transition-all ${
                      avatar === av.id
                        ? 'border-indigo-500 bg-indigo-500/25 scale-105 shadow-md shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                    title={av.label}
                  >
                    {av.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'login' && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300">{t('auth.remember')}</span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                {t('auth.loginBtn')}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {t('auth.registerBtn')}
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-300 underline underline-offset-4 transition-colors"
          >
            {t('auth.guest')}
          </button>
        </div>
      </div>
    </div>
  );
};
