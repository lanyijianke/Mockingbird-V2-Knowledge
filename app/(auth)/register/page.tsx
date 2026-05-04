'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useAuthModal } from '@/app/AuthModalContext';

function RegisterTrigger() {
  const { openAuth } = useAuthModal();
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      openAuth({ mode: 'register' });
    }
  }, [openAuth]);

  return null;
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterTrigger />
    </Suspense>
  );
}
