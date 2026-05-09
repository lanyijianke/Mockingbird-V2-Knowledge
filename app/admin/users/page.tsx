'use client';

import { useEffect, useState, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface User {
  Id: number;
  Name: string;
  Email: string;
  Role: string;
  MembershipExpiresAt: string;
  EmailVerifiedAt: string;
  Status: string;
  CreatedAt: string;
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function api(url: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  junior_member: '普通会员',
  senior_member: '高级会员',
  founder_member: '创始会员',
  admin: '管理员',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'active',
  frozen: 'frozen',
  deleted: 'deleted',
};

const STATUS_LABELS: Record<string, string> = {
  active: '正常',
  frozen: '冻结',
  deleted: '已删除',
};

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);

      const qs = params.toString();
      const data = await api(`/api/admin/users${qs ? `?${qs}` : ''}`);
      setUsers(data.users || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function isMembershipExpired(user: User): boolean {
    if (!user.MembershipExpiresAt) return false;
    return new Date(user.MembershipExpiresAt) < new Date();
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  }

  return (
    <div>
      {error && <div className="admin-error">{error}</div>}

      {/* Filters */}
      <div className="admin-filters">
        <input
          placeholder="搜索用户名或邮箱..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          加载中...
        </p>
      ) : users.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          暂无用户
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>会员到期</th>
              <th>邮箱验证</th>
              <th>状态</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.Id}>
                <td>{user.Name || '-'}</td>
                <td>{user.Email || '-'}</td>
                <td>
                  {ROLE_LABELS[user.Role] || user.Role}
                  {isMembershipExpired(user) && (
                    <span className="admin-badge expired" style={{ marginLeft: '0.4rem' }}>
                      已过期
                    </span>
                  )}
                </td>
                <td>{formatDate(user.MembershipExpiresAt)}</td>
                <td>
                  <span
                    className={`admin-badge ${user.EmailVerifiedAt ? 'verified' : 'unverified'}`}
                  >
                    {user.EmailVerifiedAt ? '已验证' : '未验证'}
                  </span>
                </td>
                <td>
                  <span className={`admin-badge ${STATUS_BADGE_CLASS[user.Status] || ''}`}>
                    {STATUS_LABELS[user.Status] || user.Status}
                  </span>
                </td>
                <td>{formatDate(user.CreatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
