import { describe, it, expect } from 'vitest';
import { getPlayerIds, getPlayerDisplayName } from './playerIds';
import type { SiteConfig } from '../../config/siteConfig.schema';

describe('getPlayerIds — protege a extração e fallback de IDs imutáveis dos jogadores', () => {
  it('retorna os IDs explícitos definidos na configuração', () => {
    const config = {
      couple: {
        partner1: { name: 'João', playerId: 'joao_custom' },
        partner2: { name: 'Maria', playerId: 'maria_custom' },
      },
    } as unknown as SiteConfig;

    const { p1Id, p2Id } = getPlayerIds(config);
    expect(p1Id).toBe('joao_custom');
    expect(p2Id).toBe('maria_custom');
  });

  it('faz fallback para o nome em minúsculo quando playerId não está definido', () => {
    const config = {
      couple: {
        partner1: { name: 'Carlos' },
        partner2: { name: 'Ana' },
      },
    } as unknown as SiteConfig;

    const { p1Id, p2Id } = getPlayerIds(config);
    expect(p1Id).toBe('carlos');
    expect(p2Id).toBe('ana');
  });

  it('faz fallback para os IDs padrão "kevin" e "iara" quando config é nula ou vazia', () => {
    expect(getPlayerIds(null)).toEqual({ p1Id: 'kevin', p2Id: 'iara' });
    expect(getPlayerIds({} as SiteConfig)).toEqual({ p1Id: 'kevin', p2Id: 'iara' });
  });

  it('protege getPlayerDisplayName para retornar o nome exibível correto ou capitalizar o ID', () => {
    const config = {
      couple: {
        partner1: { name: 'Kevin Silva', playerId: 'kevin' },
        partner2: { name: 'Iara Souza', playerId: 'iara' },
      },
    } as unknown as SiteConfig;

    expect(getPlayerDisplayName('kevin', config)).toBe('Kevin Silva');
    expect(getPlayerDisplayName('iara', config)).toBe('Iara Souza');
    expect(getPlayerDisplayName('visitante', config)).toBe('Visitante');
    expect(getPlayerDisplayName('outro', null)).toBe('Outro');
  });
});
