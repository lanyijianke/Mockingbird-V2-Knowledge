'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/academy', label: '学社首页', icon: 'bi-house', exact: true },
];

const infoItems = [
  { href: '/academy/articles', label: '精读文章', icon: 'bi-book' },
  { href: '/academy/quicknews', label: '信息流', icon: 'bi-star' },
  { href: '/academy/reports', label: '研报', icon: 'bi-file-earmark-bar-graph' },
  { href: '/academy/narratives', label: '热门叙事', icon: 'bi-fire' },
];

const readItems = [
  { href: '/academy', label: '文章', icon: 'bi-file-earmark-text', badge: '86' },
  { href: '/academy', label: '视频', icon: 'bi-play-circle', badge: '24' },
  { href: '/academy', label: '书籍', icon: 'bi-journal-bookmark', badge: '8' },
];

const collabItems = [
  { href: '/academy', label: '讨论', icon: 'bi-chat-square-text' },
  { href: '/academy', label: '投票', icon: 'bi-check2-square' },
];

const personalItems = [
  { href: '/academy', label: '阅读记录', icon: 'bi-clock-history' },
  { href: '/academy', label: '我的收藏', icon: 'bi-bookmark' },
  { href: '/academy', label: '笔记', icon: 'bi-pencil' },
];


function SidebarGroup({ label, items, pathname }: { label: string; items: typeof infoItems; pathname: string }) {
  return (
    <div className="sidebar-group">
      <div className="sidebar-group-label">{label}</div>
      {items.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.label} href={item.href} className={`sidebar-item ${isActive ? 'active' : ''}`}>
            <i className={`bi ${item.icon}`} /> {item.label}
            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
          </Link>
        );
      })}
    </div>
  );
}

const roleLabels: Record<string, { icon: string; label: string }> = {
  junior_member: { icon: 'bi-gem', label: '初级社员' },
  senior_member: { icon: 'bi-gem', label: '资深社员' },
  founder_member: { icon: 'bi-stars', label: '创始社员' },
  admin: { icon: 'bi-shield-check', label: '管理员' },
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string; membershipExpiresAt: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(res => { if (res.user) setUser(res.user); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const homeActive = pathname === '/academy';

  const roleInfo = user ? (roleLabels[user.role] || { icon: 'bi-person', label: '用户' }) : null;
  const avatarLetter = user ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="academy-breakout">
      <div className="academy-layout">
        <aside className="academy-sidebar">
          <div className="sidebar-member-card">
            <div className="sidebar-avatar">{avatarLetter}</div>
            <div className="sidebar-member-name">
              {!loaded ? '加载中...' : user ? user.name : '未登录'}
            </div>
            {roleInfo && (
              <div className="sidebar-member-tier"><i className={`bi ${roleInfo.icon}`} /> {roleInfo.label}</div>
            )}
            {!user && loaded && (
              <Link href="/login" className="sidebar-member-tier" style={{ textDecoration: 'none' }}>
                <i className="bi bi-box-arrow-in-right" /> 登录 / 注册
              </Link>
            )}
            {user?.membershipExpiresAt && (
              <div className="sidebar-member-expiry">
                有效期至 {user.membershipExpiresAt.toString().slice(0, 10).replace(/-/g, '.')}
              </div>
            )}
            {!user?.membershipExpiresAt && user && (
              <div className="sidebar-member-expiry">普通用户</div>
            )}
          </div>

          <Link href="/academy" className={`sidebar-item ${homeActive ? 'active' : ''}`}>
            <i className="bi bi-house" /> 学社首页
          </Link>

          <SidebarGroup label="信息" items={infoItems} pathname={pathname} />

          {/* 暂时隐藏，后续开放 */}
          {false && (
            <>
              <SidebarGroup label="阅读" items={readItems} pathname={pathname} />
              <SidebarGroup label="共建" items={collabItems} pathname={pathname} />
              <SidebarGroup label="个人" items={personalItems} pathname={pathname} />
            </>
          )}
        </aside>

        {children}
      </div>
    </div>
  );
}
