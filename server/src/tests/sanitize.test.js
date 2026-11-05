import { describe, expect, it } from 'vitest';
import { sanitizeComment, sanitizeDescription, sanitizeHtml } from '../utils/sanitize.js';

describe('server HTML sanitization', () => {
  it('removes scripts and event handlers from comments', () => {
    expect(sanitizeComment('<script>alert(1)</script><b onclick="alert(2)">Update</b>')).toBe(
      '<b>Update</b>'
    );
  });

  it('removes executable links without losing the link text', () => {
    const clean = sanitizeComment('<a href="javascript:alert(1)">Read update</a>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('Read update');
  });

  it('keeps the existing allowed description formatting', () => {
    expect(sanitizeDescription('<blockquote><strong>Review</strong><br>Ready</blockquote>')).toBe(
      '<blockquote><strong>Review</strong><br>Ready</blockquote>'
    );
  });

  it('treats missing/non-string input as empty text', () => {
    for (const value of [null, undefined, 123]) expect(sanitizeHtml(value)).toBe('');
  });
});
