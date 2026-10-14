import { describe, it, expect } from 'vitest';
import { mapClaims } from './claims';

describe('mapClaims — protege o parsing e mapeamento seguro de custom claims do Firebase Auth', () => {
  it('retorna role: null quando claims é nulo, indefinido ou objeto vazio', () => {
    expect(mapClaims(null)).toEqual({ role: null });
    expect(mapClaims(undefined)).toEqual({ role: null });
    expect(mapClaims({})).toEqual({ role: null, siteId: undefined });
  });

  it('mapeia corretamente roles válidas (super_admin e site_admin)', () => {
    expect(mapClaims({ role: 'super_admin' })).toEqual({
      role: 'super_admin',
      siteId: undefined,
    });

    expect(mapClaims({ role: 'site_admin', siteId: 'meu-site' })).toEqual({
      role: 'site_admin',
      siteId: 'meu-site',
    });
  });

  it('rejeita roles inesperadas ou inválidas mapeando-as para role: null', () => {
    expect(mapClaims({ role: 'moderator' })).toEqual({
      role: null,
      siteId: undefined,
    });

    expect(mapClaims({ role: 'admin' })).toEqual({
      role: null,
      siteId: undefined,
    });

    expect(mapClaims({ role: 12345 })).toEqual({
      role: null,
      siteId: undefined,
    });

    expect(mapClaims({ role: false })).toEqual({
      role: null,
      siteId: undefined,
    });
  });

  it('ignora siteId quando o tipo não for string válida', () => {
    expect(mapClaims({ role: 'site_admin', siteId: 123 })).toEqual({
      role: 'site_admin',
      siteId: undefined,
    });
  });
});
