'use client';

import { Suspense, useEffect, useRef } from 'react';

function RegisterRedirect() {
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    window.location.href = '/api/auth/start?mode=register';
  }, []);

  return null;
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterRedirect />
    </Suspense>
  );
}
