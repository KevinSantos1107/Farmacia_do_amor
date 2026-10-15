import { describe, it, expect, afterEach, vi } from 'vitest';
import { getCloudName } from './upload';

describe('cloudinary getCloudName', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('variável presente → devolve o valor', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'meu-cloud-teste');
    expect(getCloudName()).toBe('meu-cloud-teste');
  });

  it('variável ausente (string vazia) → lança erro esperado', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '');
    expect(() => getCloudName()).toThrow(
      'Cloudinary não configurado: defina VITE_CLOUDINARY_CLOUD_NAME'
    );
  });

  it('variável ausente (somente espaços) → lança erro esperado', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '   ');
    expect(() => getCloudName()).toThrow(
      'Cloudinary não configurado: defina VITE_CLOUDINARY_CLOUD_NAME'
    );
  });

  it('variável ausente (undefined) → lança erro esperado', () => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', undefined as unknown as string);
    expect(() => getCloudName()).toThrow(
      'Cloudinary não configurado: defina VITE_CLOUDINARY_CLOUD_NAME'
    );
  });
});
