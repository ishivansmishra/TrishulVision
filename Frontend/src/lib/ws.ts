// Build a ws/wss URL from API_BASE_URL
import { API_BASE_URL } from './config';

export const getWsBaseUrl = (): string => {
  try {
    const http = new URL(API_BASE_URL);
    const proto = http.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${http.host}`;
  } catch {
    // Fallback to localhost
    return 'ws://localhost:8000';
  }
};
