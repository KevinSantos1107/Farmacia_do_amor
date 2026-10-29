import { describe, it, expect, vi } from 'vitest';
import handler, { getManifestPayload, DEFAULT_APP_NAME } from './manifest.ts';
import type { VercelRequest, VercelResponse } from '@vercel/node';

describe('api/manifest', () => {
  it('gera manifesto com nome customizado do casal', () => {
    const payload = getManifestPayload('Kevin & Iara');
    expect(payload.name).toBe('Kevin & Iara');
    expect(payload.short_name).toBe('Kevin & Iara');
    expect(payload.display).toBe('standalone');
    expect(payload.start_url).toBe('/');
    expect(payload.icons.length).toBeGreaterThan(0);
  });

  it('faz fallback para DEFAULT_APP_NAME se o nome for vazio', () => {
    const payload = getManifestPayload('');
    expect(payload.name).toBe(DEFAULT_APP_NAME);
    expect(payload.short_name).toBe(DEFAULT_APP_NAME);
  });

  it('retorna resposta JSON com status 200 e headers corretos', async () => {
    const headers: Record<string, string> = {};
    let statusCode = 0;
    let jsonBody: unknown = null;

    const req = {
      query: { name: 'Lucas & Beatriz' },
    } as unknown as VercelRequest;

    const res = {
      setHeader: vi.fn((k: string, v: string) => {
        headers[k] = v;
      }),
      status: vi.fn((code: number) => {
        statusCode = code;
        return res;
      }),
      json: vi.fn((data: unknown) => {
        jsonBody = data;
        return res;
      }),
    } as unknown as VercelResponse;

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(headers['Content-Type']).toBe('application/manifest+json; charset=utf-8');
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect((jsonBody as { name: string }).name).toBe('Lucas & Beatriz');
    expect((jsonBody as { short_name: string }).short_name).toBe('Lucas & Beatriz');
  });
});
