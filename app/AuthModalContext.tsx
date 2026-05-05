'use client';

import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode, type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSiteBrandConfig } from '@/lib/site-config';
import '@/app/_styles/auth.css';
import '@/app/_styles/auth-modal.css';

const OAUTH_ERROR_MAP: Record<string, string> = {
  oauth_unconfigured: '第三方登录未配置，请联系管理员',
  oauth_failed: '第三方登录失败，请重试',
  oauth_error: '第三方登录异常，请稍后重试',
  no_email: '第三方账号未关联邮箱，无法登录',
};

function translateError(raw?: string): string {
  if (!raw) return '';
  return OAUTH_ERROR_MAP[raw] || raw;
}

const SITE_BRAND = getSiteBrandConfig();

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'membership';

export interface AuthModalOptions {
  mode: AuthMode;
  callbackUrl?: string;
  error?: string;
}

interface AuthModalContextValue {
  openAuth: (options: AuthModalOptions) => void;
  closeAuth: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOptions>({ mode: 'login' });
  const router = useRouter();

  const openAuth = useCallback((opts: AuthModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleLoginSuccess = useCallback((callbackUrl?: string) => {
    setIsOpen(false);
    router.refresh();
    if (callbackUrl && callbackUrl !== '/') {
      router.push(callbackUrl);
    }
  }, [router]);

  const switchMode = useCallback((mode: AuthMode) => {
    setOptions(prev => ({ ...prev, mode, error: undefined }));
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="auth-modal-overlay" onClick={closeAuth}>
          <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={closeAuth} aria-label="关闭">
              <i className="bi bi-x-lg" />
            </button>
            {options.mode === 'login' ? (
              <LoginForm
                initialError={options.error}
                callbackUrl={options.callbackUrl}
                onSuccess={handleLoginSuccess}
                onSwitchMode={switchMode}
              />
            ) : options.mode === 'register' ? (
              <RegisterForm
                onSwitchToLogin={() => switchMode('login')}
              />
            ) : options.mode === 'forgot-password' ? (
              <ForgotPasswordForm
                onSwitchToLogin={() => switchMode('login')}
              />
            ) : (
              <MembershipForm
                onSuccess={() => {
                  setIsOpen(false);
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>,
        document.body,
      )}
    </AuthModalContext.Provider>
  );
}

/* ── Login Form ── */

function LoginForm({
  initialError,
  callbackUrl,
  onSuccess,
  onSwitchMode,
}: {
  initialError?: string;
  callbackUrl?: string;
  onSuccess: (callbackUrl?: string) => void;
  onSwitchMode: (mode: AuthMode) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(translateError(initialError));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败，请重试');
        return;
      }
      onSuccess(callbackUrl);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="auth-title">登录</h1>
      <p className="auth-subtitle">欢迎回到 {SITE_BRAND.brandName}</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div>
          <label className="auth-label" htmlFor="modal-email">邮箱</label>
          <input id="modal-email" type="email" className="auth-input"
            placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            required autoComplete="email" />
        </div>

        <div>
          <label className="auth-label" htmlFor="modal-password">密码</label>
          <input id="modal-password" type="password" className="auth-input"
            placeholder="输入密码" value={password}
            onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password" />
        </div>

        <div style={{ textAlign: 'right' }}>
          <button type="button" className="auth-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
            onClick={() => onSwitchMode('forgot-password')}>
            忘记密码？
          </button>
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <div className="auth-divider">或</div>

      <div className="auth-oauth-group">
        <a href="/api/auth/oauth/github" className="auth-oauth-button auth-oauth-button--github">
          <i className="bi bi-github" /> GitHub
        </a>
        <a href="/api/auth/oauth/google" className="auth-oauth-button auth-oauth-button--google">
          <i className="bi bi-google" /> Google
        </a>
      </div>

      <div className="auth-toggle-text">
        没有账户？
        <button type="button" className="auth-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
          onClick={() => onSwitchMode('register')}>
          注册
        </button>
      </div>
    </div>
  );
}

/* ── Register Form ── */

function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('两次密码不一致'); return; }
    if (password.length < 8) { setError('密码至少 8 个字符'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '注册失败，请重试'); return; }
      setSuccess(true);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="auth-title">注册成功</h1>
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          注册成功！请检查邮箱验证
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          我们已向你的邮箱发送了一封验证邮件，请点击邮件中的链接完成验证。
        </p>
        <button className="auth-button" style={{ display: 'block', width: '100%' }}
          onClick={onSwitchToLogin}>
          前往登录
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="auth-title">注册</h1>
      <p className="auth-subtitle">加入 {SITE_BRAND.siteName}</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div>
          <label className="auth-label" htmlFor="modal-name">姓名</label>
          <input id="modal-name" type="text" className="auth-input"
            placeholder="你的名字" value={name}
            onChange={e => setName(e.target.value)}
            required autoComplete="name" />
        </div>

        <div>
          <label className="auth-label" htmlFor="modal-reg-email">邮箱</label>
          <input id="modal-reg-email" type="email" className="auth-input"
            placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            required autoComplete="email" />
        </div>

        <div>
          <label className="auth-label" htmlFor="modal-reg-password">密码</label>
          <input id="modal-reg-password" type="password" className="auth-input"
            placeholder="至少 8 个字符" value={password}
            onChange={e => setPassword(e.target.value)}
            required minLength={8} autoComplete="new-password" />
        </div>

        <div>
          <label className="auth-label" htmlFor="modal-confirm">确认密码</label>
          <input id="modal-confirm" type="password" className="auth-input"
            placeholder="再次输入密码" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required autoComplete="new-password" />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <div className="auth-toggle-text">
        已有账户？
        <button type="button" className="auth-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
          onClick={onSwitchToLogin}>
          登录
        </button>
      </div>
    </div>
  );
}

/* ── Forgot Password Form ── */

function ForgotPasswordForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '请求失败，请重试');
        return;
      }
      setSuccess(true);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="auth-title">邮件已发送</h1>
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          如果邮箱存在，重置邮件已发送
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          请检查你的收件箱（包括垃圾邮件），点击邮件中的链接重置密码。
        </p>
        <button className="auth-button" style={{ display: 'block', width: '100%' }}
          onClick={onSwitchToLogin}>
          返回登录
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="auth-title">忘记密码</h1>
      <p className="auth-subtitle">输入注册邮箱，我们将发送重置链接</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div>
          <label className="auth-label" htmlFor="modal-fp-email">邮箱</label>
          <input id="modal-fp-email" type="email" className="auth-input"
            placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            required autoComplete="email" />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? '发送中...' : '发送重置链接'}
        </button>
      </form>

      <div className="auth-toggle-text">
        <button type="button" className="auth-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
          onClick={onSwitchToLogin}>
          返回登录
        </button>
      </div>
    </div>
  );
}

/* ── Membership Redeem Form ── */

function MembershipForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('请输入邀请码'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/membership/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '兑换失败，请重试'); return; }
      setSuccess(true);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="auth-title">会员兑换成功</h1>
        <div className="auth-success" style={{ marginBottom: '1.5rem' }}>
          欢迎加入会员
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          你已成功成为会员，享受所有专属功能。
        </p>
        <button className="auth-button" style={{ display: 'block', width: '100%' }} onClick={onSuccess}>
          完成
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="auth-title">会员兑换</h1>
      <p className="auth-subtitle">输入邀请码，解锁会员专属功能</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div>
          <label className="auth-label" htmlFor="modal-membership-code">邀请码</label>
          <input id="modal-membership-code" type="text" className="auth-input"
            placeholder="输入邀请码" value={code}
            onChange={e => setCode(e.target.value)}
            required />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? '兑换中...' : '兑换邀请码'}
        </button>
      </form>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '1rem' }}>
        没有邀请码？暂时无法加入。
      </p>
    </div>
  );
}
