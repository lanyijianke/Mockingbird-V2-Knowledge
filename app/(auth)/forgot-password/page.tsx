'use client';

import { Suspense, useEffect, useRef } from 'react';

function ForgotPasswordRedirect() {
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    window.location.href = '/api/auth/start?mode=forgot-password';
  }, []);

  return null;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordRedirect />
    </Suspense>
  );
}
