// Centralized API configuration for vocabulary-frontend

const envUrl = import.meta.env.VITE_API_BASE_URL;

// Prevent broken Vercel backend URLs from overriding the active Render backend
export const API_BASE =
  (envUrl && !envUrl.includes('vercel.app'))
    ? envUrl
    : (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000'
        : 'https://vocabquiz-knjm.onrender.com');
