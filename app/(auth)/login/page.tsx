'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthModal } from '@/app/AuthModalContext';

function LoginTrigger() {
  const searchParams = useSearchParams();
  const { openAuth } = useAuthModal();
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      openAuth({
        mode: 'login',
        callbackUrl: searchParams.get('callbackUrl') || undefined,
        error: searchParams.get('error') || undefined,
      });
    }
  }, [openAuth, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginTrigger />
    </Suspense>
  );
}
