export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

export const withAuth = (headers: HeadersInit = {}): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
};
