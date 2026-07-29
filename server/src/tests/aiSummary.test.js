// Unit test for the AI summary service's GRACEFUL FALLBACK — the most important
// safety property: if the Groq client is unavailable, the app must still return
// a deterministic summary with riskFlag "unknown" instead of crashing.
// We mock groq as disabled (no API key) and mock Prisma so no real DB is needed.
import { describe, it, expect, vi } from 'vitest';

// No API key configured → service should use the fallback path.
vi.mock('../config/groq.js', () => ({ groqEnabled: false, GROQ_MODEL: 'test-model', groqChat: vi.fn() }));

// Mock Prisma: return a project with tasks, and echo back what we "save".
vi.mock('../config/db.js', () => ({
  default: {
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'p1',
        title: 'Demo Project',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days out
        client: { name: 'Acme' },
        tasks: [
          { status: 'done', hoursLogged: 4, createdAt: new Date(), comments: [] },
          { status: 'todo', hoursLogged: 0, createdAt: new Date(), comments: [] },
        ],
      }),
    },
    aISummary: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's1', generatedAt: new Date(), ...data })),
    },
  },
}));

// Logger is mocked so the expected error log doesn't clutter test output.
vi.mock('../utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { generateProjectSummary } from '../services/aiSummaryService.js';

describe('generateProjectSummary (fallback path)', () => {
  it('returns a deterministic summary with riskFlag "unknown" when AI is unavailable', async () => {
    const result = await generateProjectSummary('p1');

    expect(result.riskFlag).toBe('unknown');
    expect(result.summaryText).toContain('AI summary unavailable');
    // 1 of 2 tasks done should be reflected in the template text.
    expect(result.summaryText).toContain('1 of 2 tasks completed');
    expect(result.aiUsed).toBe(false);
  });
});
