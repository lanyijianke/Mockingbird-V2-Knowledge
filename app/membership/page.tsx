'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useAuthModal } from '@/app/AuthModalContext';

function MembershipTrigger() {
  const { openAuth } = useAuthModal();
  const opened = useRef(false);

  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      openAuth({ mode: 'membership' });
    }
  }, [openAuth]);

  return null;
}

export default function MembershipPage() {
  return (
    <Suspense>
      <MembershipTrigger />
    </Suspense>
  );
}
