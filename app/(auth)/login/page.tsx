'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginRedirect() {
  const searchParams = useSearchParams();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    const params = new URLSearchParams({ mode: 'login' });
    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) params.set('callbackUrl', callbackUrl);

    window.location.href = `/api/auth/start?${params.toString()}`;
  }, [searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginRedirect />
    </Suspense>
  );
}
