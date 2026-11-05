import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeHtml(dirty, options = {}) {
  if (typeof dirty !== 'string') return '';
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ...options,
  });
}

// Email templates need escaped text, rather than user-supplied HTML.
export function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, (char) => entities[char]);
}

export function sanitizeComment(text) {
  return sanitizeHtml(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizeDescription(text) {
  return sanitizeHtml(text, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'u',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}
