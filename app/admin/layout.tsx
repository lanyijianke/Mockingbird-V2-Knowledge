'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import '@/app/_styles/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === '/admin/login') {
      setChecked(true);
      return;
    }

    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  function handleLogout() {
    localStorage.removeItem('admin_token');
    router.replace('/admin/login');
  }

  // On login page, render without header
  if (pathname === '/admin/login') {
    return checked ? <>{children}</> : null;
  }

  // Show nothing until auth check completes
  if (!checked) {
    return null;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Mockingbird Admin</h1>
        <nav className="admin-nav">
          <a
            href="/admin/invitations"
            className={pathname.startsWith('/admin/invitations') ? 'active' : ''}
          >
            邀请码管理
          </a>
          <a
            href="/admin/users"
            className={pathname === '/admin/users' ? 'active' : ''}
          >
            用户列表
          </a>
          <button className="admin-btn" onClick={handleLogout}>
            退出
          </button>
        </nav>
      </header>

      {children}
    </div>
  );
}
