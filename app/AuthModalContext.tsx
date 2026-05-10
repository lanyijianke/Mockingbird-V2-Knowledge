'use client';

import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode, type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import '@/app/_styles/auth.css';
import '@/app/_styles/auth-modal.css';

export type AuthMode = 'login' | 'membership';

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

function redirectToSso(mode: string, callbackUrl?: string) {
  const params = new URLSearchParams({ mode });
  if (callbackUrl && callbackUrl !== '/') params.set('callbackUrl', callbackUrl);
  window.location.href = `/api/auth/start?${params.toString()}`;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOptions>({ mode: 'login' });
  const router = useRouter();

  const openAuth = useCallback((opts: AuthModalOptions) => {
    if (opts.mode === 'login') {
      redirectToSso('login', opts.callbackUrl);
      return;
    }
    // 会员兑换跳转到 Auth 的兑换页面
    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:5050';
    const from = window.location.href;
    window.location.href = `${authUrl}/membership?from=${encodeURIComponent(from)}`;
  }, []);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="auth-modal-overlay" onClick={closeAuth}>
          <div className="auth-modal-card" onClick={e => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={closeAuth} aria-label="关闭">
              <i className="bi bi-x-lg" />
            </button>
            <MembershipForm
              onSuccess={() => {
                setIsOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>,
        document.body,
      )}
    </AuthModalContext.Provider>
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
