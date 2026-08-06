import { pinyin } from 'pinyin-pro';

export function formatChinesePinyin(text) {
  if (!text || typeof text !== 'string') return text || '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // If text contains Chinese characters and does not already contain Pinyin in parentheses
  if (/[\u4e00-\u9fa5\u3400-\u4dbf]/.test(trimmed) && !/\([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s]+\)/.test(trimmed)) {
    try {
      const py = pinyin(trimmed);
      if (py) {
        return `${trimmed} (${py})`;
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}
