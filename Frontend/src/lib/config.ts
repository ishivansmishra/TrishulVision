export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "https://trishul-backend.onrender.com";

export const withAuth = (headers: HeadersInit = {}): HeadersInit => {
  const token = localStorage.getItem("auth_token");
  return token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;
};
