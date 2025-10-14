import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const RoleBanner: React.FC = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const mismatch = params.get('role_mismatch') === '1';
  const wanted = params.get('wanted_role');
  const role = params.get('role');
  if (!mismatch) return null;
  return (
    <div className="max-w-5xl mx-auto mt-2 px-4">
      <Alert>
        <AlertTitle>Role adjusted</AlertTitle>
        <AlertDescription>
          You attempted to sign in as "{wanted}". Your account is registered as "{role}". We've routed you accordingly.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default RoleBanner;
