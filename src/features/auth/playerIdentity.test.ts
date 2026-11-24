import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { usePlayerIdentityStore } from '../../store/usePlayerIdentityStore';

describe('usePlayerIdentityStore & Session Management', () => {
  beforeAll(() => {
    const storeMap = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => storeMap.set(k, v),
      removeItem: (k: string) => storeMap.delete(k),
      clear: () => storeMap.clear(),
      length: 0,
      key: () => null,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    usePlayerIdentityStore.setState({
      player: 'visitante',
      tokenId: null,
      uid: null,
      tokenStatus: 'checking',
    });
  });

  it('inicializa com estado padrão seguro (visitante, sem tokenId, checking)', () => {
    const state = usePlayerIdentityStore.getState();
    expect(state.player).toBe('visitante');
    expect(state.tokenId).toBeNull();
    expect(state.uid).toBeNull();
    expect(state.tokenStatus).toBe('checking');
  });

  it('permite registrar e atualizar player, tokenId, uid e tokenStatus', () => {
    const store = usePlayerIdentityStore.getState();
    store.setPlayer('kevin');
    store.setTokenId('valid_magic_token_123');
    store.setUid('anon_uid_456');
    store.setTokenStatus('authorized');

    const updated = usePlayerIdentityStore.getState();
    expect(updated.player).toBe('kevin');
    expect(updated.tokenId).toBe('valid_magic_token_123');
    expect(updated.uid).toBe('anon_uid_456');
    expect(updated.tokenStatus).toBe('authorized');
  });

  it('clearSession() revoga imediatamente o acesso, resetando para visitante e unauthorized', () => {
    const store = usePlayerIdentityStore.getState();
    store.setPlayer('kevin');
    store.setTokenId('token_para_amigo_789');
    store.setUid('anon_uid_789');
    store.setTokenStatus('authorized');

    expect(usePlayerIdentityStore.getState().tokenStatus).toBe('authorized');

    // Simula a revogação do token pelo admin
    store.clearSession();

    const revoked = usePlayerIdentityStore.getState();
    expect(revoked.player).toBe('visitante');
    expect(revoked.tokenId).toBeNull();
    expect(revoked.tokenStatus).toBe('unauthorized');
  });

  it('mantém o contrato de persistência serializando apenas player e tokenId', () => {
    usePlayerIdentityStore.setState({
      player: 'iara',
      tokenId: 'token_iara_secure',
      uid: 'temp_uid',
      tokenStatus: 'authorized',
    });

    const storeOptions = (usePlayerIdentityStore as unknown as {
      persist: { getOptions: () => { partialize: (s: unknown) => unknown } };
    }).persist?.getOptions();

    if (storeOptions?.partialize) {
      const persisted = storeOptions.partialize(usePlayerIdentityStore.getState()) as {
        player: string;
        tokenId: string | null;
        tokenStatus?: unknown;
        uid?: unknown;
      };
      expect(persisted.player).toBe('iara');
      expect(persisted.tokenId).toBe('token_iara_secure');
      expect(persisted.tokenStatus).toBeUndefined();
      expect(persisted.uid).toBeUndefined();
    }
  });
});
