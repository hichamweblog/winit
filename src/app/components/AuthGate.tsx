'use client';

/**
 * Authentication gate.
 *
 * Renders the app only once the server has confirmed a session. Anonymous
 * visitors get a sign-in / create-account screen; when the operator has enabled
 * demo mode there is also a one-click way into the shared scratch workspace.
 *
 * This is a UX gate, not the security boundary — every API route independently
 * requires a session. Hiding this component would not expose any data.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiClientError, UNAUTHENTICATED_EVENT } from '@/lib/client-api';
import { AlertTriangle, ArrowNarrowLeft, Eye, EyeOff, Loader, Lock, Logout, Mail, User } from '../icons';
import { WinItLogo } from './Logo';
import { useLocale } from '../locale';

type SessionUser = {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  role: string;
  demo: boolean;
};

type SessionResponse = { user: SessionUser | null; csrfToken: string | null; demoMode: boolean };

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'anonymous' | 'ready'>('loading');
  const [demoMode, setDemoMode] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const { t } = useLocale();

  const load = useCallback(async () => {
    try {
      const session = await api<SessionResponse>('/api/auth/session');
      setDemoMode(session.demoMode);
      setUser(session.user);
      setState(session.user ? 'ready' : 'anonymous');
    } catch {
      setState('anonymous');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onUnauthenticated = () => { setUser(null); setState('anonymous'); };
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
  }, []);

  if (state === 'loading') {
    return (
      <div className="auth-screen" role="status" aria-live="polite">
        <Loader size={22} className="auth-spinner" />
        <span className="visually-hidden">{t('جارٍ التحقق من الجلسة')}</span>
      </div>
    );
  }

  if (state === 'anonymous') {
    return <AuthScreen demoMode={demoMode} onSignedIn={() => void load()} />;
  }

  const signOut = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* clearing locally is enough */ }
    setUser(null);
    // In demo mode the server re-admits anonymous visitors, so reload to land
    // back in the shared workspace rather than on a login form that cannot fail.
    if (demoMode) { window.location.reload(); return; }
    setState('anonymous');
  };

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {user?.demo && (
        <p className="demo-banner" role="note">
          <AlertTriangle size={15} />
          {t('وضع التجربة: مساحة مشتركة مفتوحة للجميع، وبياناتها غير خاصة.')}
          <span className="demo-banner__hint">{t('أنشئ حساباً للحصول على مساحة خاصة بك.')}</span>
        </p>
      )}
      {children}
    </AuthContext.Provider>
  );
}

const AuthContext = createContext<{ user: SessionUser | null; signOut: () => Promise<void> }>({ user: null, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

function AuthScreen({ onSignedIn }: { demoMode: boolean; onSignedIn: () => void }) {
  const { language, setLanguage, t } = useLocale();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        body: mode === 'login' ? { email, password } : { email, name, password },
      });
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : t('تعذر الاتصال بالخادم'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <main className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand"><WinItLogo height={36} /></div>
        <div className="auth-language-picker" role="group" aria-label={t('إعدادات اللغة')}>
          <button type="button" aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>{t('عربي')}</button>
          <button type="button" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
        </div>
        <h1 id="auth-heading">{t(mode === 'login' ? 'أهلاً بعودتك' : 'أنشئ حسابك')}</h1>
        <p className="auth-lede">
          {t(mode === 'login' ? 'سجّل الدخول لتصل إلى مهامك وعاداتك ويومياتك.' : 'مساحة خاصة لك، مرتبطة بحسابك وحدك.')}
        </p>

        <form onSubmit={submit} noValidate={false}>
          {mode === 'register' && (
            <label className="auth-field">
              <span>{t('الاسم')}</span>
              <span className="auth-input">
                <User size={17} />
                <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" dir="auto" placeholder={t('اسمك')} />
              </span>
            </label>
          )}
          <label className="auth-field">
            <span>{t('البريد الإلكتروني')}</span>
            <span className="auth-input">
              <Mail size={17} />
              <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} autoComplete="email" dir="ltr" placeholder="you@example.com" />
            </span>
          </label>
          <label className="auth-field">
            <span>{t('كلمة المرور')}</span>
            <span className="auth-input">
              <Lock size={17} />
              <input
                name="password"
                type={reveal ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 10 : 1}
                maxLength={128}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                dir="ltr"
                placeholder={mode === 'register' ? t('10 أحرف على الأقل') : '••••••••'}
              />
              <button type="button" className="auth-reveal" onClick={() => setReveal((v) => !v)} aria-label={t(reveal ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور')} aria-pressed={reveal}>
                {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary primary-button auth-submit" disabled={busy}>
            {busy ? <Loader size={16} className="auth-spinner" /> : null}
            {busy ? t('جارٍ التحقق…') : t(mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب')}
          </button>
        </form>

        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {t(mode === 'login' ? 'ليس لديك حساب؟ أنشئ واحداً' : 'لديك حساب بالفعل؟ سجّل الدخول')}
          <ArrowNarrowLeft size={15} />
        </button>

      </main>
    </div>
  );
}
