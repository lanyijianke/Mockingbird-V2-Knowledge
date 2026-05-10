'use client';

import { useEffect } from 'react';

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:5050';

export default function ProfilePage() {
  useEffect(() => {
    const previousPage = sessionStorage.getItem('profile_from') || '/';
    sessionStorage.removeItem('profile_from');
    window.location.href = `${AUTH_BASE}/profile?from=${encodeURIComponent(previousPage)}`;
  }, []);

  return null;
}
