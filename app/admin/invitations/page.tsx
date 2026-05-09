'use client';

import { useEffect, useState, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface Invitation {
  Id: number;
  Code: string;
  TargetRole: string;
  MembershipDurationDays: number;
  MaxUses: number;
  UsedCount: number;
  ExpiresAt: string;
  CreatedAt: string;
  Status: string;
  DisplayStatus: string;
}

interface Redemption {
  Id: number;
  UserName: string;
  UserEmail: string;
  RedeemedAt: string;
}

interface FormData {
  code: string;
  targetRole: string;
  membershipDurationDays: number;
  maxUses: number;
  expiresAt: string;
  status?: string;
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
  junior_member: '普通会员',
  senior_member: '高级会员',
  founder_member: '创始会员',
};

const ROLE_DEFAULT_DAYS: Record<string, number> = {
  junior_member: 30,
  senior_member: 365,
  founder_member: 999 * 365,
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  '有效': 'active',
  '已过期': 'expired',
  '已用尽': 'exhausted',
  '已停用': 'disabled',
};

const emptyForm: FormData = {
  code: '',
  targetRole: 'junior_member',
  membershipDurationDays: 30,
  maxUses: 1,
  expiresAt: '',
  status: 'active',
};

// ════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [codeFilter, setCodeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Invitation | null>(null);
  const [redemptionsItem, setRedemptionsItem] = useState<Invitation | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  // Form
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ═══ Load invitations ═══
  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (codeFilter) params.set('code', codeFilter);
      if (roleFilter) params.set('targetRole', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const qs = params.toString();
      const data = await api(`/api/admin/invitations${qs ? `?${qs}` : ''}`);
      setInvitations(data.invitations || []);
    } catch (err) {
      showMessage('error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [codeFilter, roleFilter, statusFilter]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // ═══ Message helper ═══
  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // ═══ Selection ═══
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === invitations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invitations.map((inv) => inv.Id)));
    }
  }

  // ═══ Create ═══
  function openCreate() {
    setForm({ ...emptyForm, expiresAt: '' });
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!form.code.trim() || !form.expiresAt) return;
    setFormSubmitting(true);
    try {
      await api('/api/admin/invitations', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          targetRole: form.targetRole,
          membershipDurationDays: form.membershipDurationDays,
          maxUses: form.maxUses,
          expiresAt: form.expiresAt,
        }),
      });
      showMessage('success', '邀请码创建成功');
      setShowCreate(false);
      loadInvitations();
    } catch (err) {
      showMessage('error', (err as Error).message);
    } finally {
      setFormSubmitting(false);
    }
  }

  // ═══ Edit ═══
  function openEdit(inv: Invitation) {
    setForm({
      code: inv.Code,
      targetRole: inv.TargetRole,
      membershipDurationDays: inv.MembershipDurationDays,
      maxUses: inv.MaxUses,
      expiresAt: inv.ExpiresAt
        ? new Date(inv.ExpiresAt).toISOString().slice(0, 16)
        : '',
      status: inv.Status,
    });
    setEditItem(inv);
  }

  async function handleEdit() {
    if (!editItem) return;
    setFormSubmitting(true);
    try {
      await api(`/api/admin/invitations/${editItem.Id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      showMessage('success', '邀请码更新成功');
      setEditItem(null);
      loadInvitations();
    } catch (err) {
      showMessage('error', (err as Error).message);
    } finally {
      setFormSubmitting(false);
    }
  }

  // ═══ Delete ═══
  async function handleDelete(id: number) {
    if (!confirm('确认删除此邀请码？')) return;
    try {
      await api(`/api/admin/invitations/${id}`, { method: 'DELETE' });
      showMessage('success', '邀请码已删除');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      loadInvitations();
    } catch (err) {
      showMessage('error', (err as Error).message);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`确认删除选中的 ${selectedIds.size} 个邀请码？`)) return;
    try {
      await api('/api/admin/invitations/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      showMessage('success', `已删除 ${selectedIds.size} 个邀请码`);
      setSelectedIds(new Set());
      loadInvitations();
    } catch (err) {
      showMessage('error', (err as Error).message);
    }
  }

  // ═══ Redemptions ═══
  async function openRedemptions(inv: Invitation) {
    setRedemptionsItem(inv);
    setRedemptionsLoading(true);
    setRedemptions([]);
    try {
      const data = await api(`/api/admin/invitations/${inv.Id}/redemptions`);
      setRedemptions(data.redemptions || []);
    } catch (err) {
      showMessage('error', (err as Error).message);
    } finally {
      setRedemptionsLoading(false);
    }
  }

  // ═══ Role change handler ═══
  function handleRoleChange(role: string) {
    setForm((prev) => ({
      ...prev,
      targetRole: role,
      membershipDurationDays: ROLE_DEFAULT_DAYS[role] || 30,
    }));
  }

  // ═══ Render ═══
  return (
    <div>
      {message && (
        <div className={message.type === 'success' ? 'admin-success' : 'admin-error'}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="admin-filters">
        <input
          placeholder="搜索邀请码..."
          value={codeFilter}
          onChange={(e) => setCodeFilter(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">全部角色</option>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          <option value="有效">有效</option>
          <option value="已过期">已过期</option>
          <option value="已用尽">已用尽</option>
          <option value="已停用">已停用</option>
        </select>
        <button className="admin-btn primary" onClick={openCreate}>
          + 创建邀请码
        </button>
        {selectedIds.size > 0 && (
          <button className="admin-btn danger" onClick={handleBatchDelete}>
            删除选中 ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          加载中...
        </p>
      ) : invitations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          暂无邀请码
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === invitations.length && invitations.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>邀请码</th>
              <th>目标角色</th>
              <th>时长(天)</th>
              <th>使用次数</th>
              <th>过期时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.Id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(inv.Id)}
                    onChange={() => toggleSelect(inv.Id)}
                  />
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {inv.Code}
                </td>
                <td>{ROLE_LABELS[inv.TargetRole] || inv.TargetRole}</td>
                <td>{inv.MembershipDurationDays}</td>
                <td>
                  {inv.UsedCount}/{inv.MaxUses || '∞'}
                </td>
                <td>{inv.ExpiresAt ? new Date(inv.ExpiresAt).toLocaleString('zh-CN') : '-'}</td>
                <td>
                  <span className={`admin-badge ${STATUS_BADGE_CLASS[inv.DisplayStatus] || ''}`}>
                    {inv.DisplayStatus}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn" onClick={() => openRedemptions(inv)}>
                      兑换记录
                    </button>
                    <button className="admin-btn" onClick={() => openEdit(inv)}>
                      编辑
                    </button>
                    <button className="admin-btn danger" onClick={() => handleDelete(inv.Id)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ═══ Create Modal ═══ */}
      {showCreate && (
        <div className="admin-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>创建邀请码</h2>

            <label>邀请码</label>
            <input
              placeholder="如: LAUNCH2025"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />

            <label>目标角色</label>
            <select value={form.targetRole} onChange={(e) => handleRoleChange(e.target.value)}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <label>会员时长（天）</label>
            <input
              type="number"
              min={1}
              value={form.membershipDurationDays}
              onChange={(e) => setForm({ ...form, membershipDurationDays: Number(e.target.value) })}
            />

            <label>最大使用次数</label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
            />

            <label>过期时间</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />

            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setShowCreate(false)}>取消</button>
              <button className="admin-btn primary" onClick={handleCreate} disabled={formSubmitting}>
                {formSubmitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Modal ═══ */}
      {editItem && (
        <div className="admin-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>编辑邀请码</h2>

            <label>邀请码</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />

            <label>目标角色</label>
            <select value={form.targetRole} onChange={(e) => handleRoleChange(e.target.value)}>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <label>会员时长（天）</label>
            <input
              type="number"
              min={1}
              value={form.membershipDurationDays}
              onChange={(e) => setForm({ ...form, membershipDurationDays: Number(e.target.value) })}
            />

            <label>最大使用次数</label>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
            />

            <label>过期时间</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />

            <label>状态</label>
            <select
              value={form.status || 'active'}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>

            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setEditItem(null)}>取消</button>
              <button className="admin-btn primary" onClick={handleEdit} disabled={formSubmitting}>
                {formSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Redemptions Modal ═══ */}
      {redemptionsItem && (
        <div className="admin-modal-overlay" onClick={() => setRedemptionsItem(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>兑换记录 — {redemptionsItem.Code}</h2>

            {redemptionsLoading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                加载中...
              </p>
            ) : redemptions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                暂无兑换记录
              </p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>邮箱</th>
                    <th>兑换时间</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((r) => (
                    <tr key={r.Id}>
                      <td>{r.UserName || '-'}</td>
                      <td>{r.UserEmail || '-'}</td>
                      <td>{new Date(r.RedeemedAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="admin-modal-actions">
              <button className="admin-btn" onClick={() => setRedemptionsItem(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
