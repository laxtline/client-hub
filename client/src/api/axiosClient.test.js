import { describe, it, expect, vi, afterEach } from 'vitest';
import axiosClient, { refreshSession, getAccessToken, setAccessToken } from './axiosClient.js';

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe('refresh coordination', () => {
  it('shares a single request between concurrent session restores', async () => {
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({
      data: { user: { id: 'u1' }, accessToken: 'refreshed-token' },
    });
    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(getAccessToken()).toBe('refreshed-token');
  });

  it('does not retry an expired refresh cookie', async () => {
    const post = vi.spyOn(axiosClient, 'post').mockRejectedValue({ response: { status: 401 } });
    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 401 } });
    expect(post).toHaveBeenCalledTimes(1);
  });
});
