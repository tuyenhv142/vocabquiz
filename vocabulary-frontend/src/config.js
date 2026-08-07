// Centralized API configuration for vocabulary-frontend

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://vocabquiz-bv86kafuq-nil-14de.vercel.app');
