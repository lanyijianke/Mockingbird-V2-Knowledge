'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useAuthModal } from '@/app/AuthModalContext';

function ForgotPasswordTrigger() {
  const { openAuth } = useAuthModal();
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      openAuth({ mode: 'forgot-password' });
    }
  }, [openAuth]);

  return null;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordTrigger />
    </Suspense>
  );
}
