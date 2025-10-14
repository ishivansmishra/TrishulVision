import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type Props = {
  role?: 'authority' | 'user';
  children: React.ReactNode;
};

function decodeToken(token: string): any | null {
  try {
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export const ProtectedRoute: React.FC<Props> = ({ role, children }) => {
  const location = useLocation();
  // In local development, allow accessing protected pages without forcing login
  // This makes it easier to verify pages load while backend auth is not configured.
  const isDev = (import.meta as any).env?.DEV;
  if (isDev) {
    return <>{children}</>;
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    // redirect to matching login with role hint if provided
    const target = role === 'authority' ? '/login?role=authority' : '/login?role=user';
    return <Navigate to={target} state={{ from: location }} replace />;
  }
  const payload = decodeToken(token);
  if (!payload) {
    localStorage.removeItem('auth_token');
    const target = role === 'authority' ? '/login?role=authority' : '/login?role=user';
    return <Navigate to={target} state={{ from: location }} replace />;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < nowSec) {
    localStorage.removeItem('auth_token');
    const target = role === 'authority' ? '/login?role=authority' : '/login?role=user';
    return <Navigate to={target} state={{ from: location }} replace />;
  }
  if (role && payload.role !== role) {
    // role mismatch: send to that role's home
    return <Navigate to={payload.role === 'authority' ? '/authority/home' : '/user/home'} replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
