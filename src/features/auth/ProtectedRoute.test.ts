import { describe, it, expect } from 'vitest';
import { getRouteAccess } from './ProtectedRoute';

describe('getRouteAccess — protege a política de controle de acesso a rotas administrativas', () => {
  it('retorna "loading" quando o estado de autenticação ainda está carregando', () => {
    expect(
      getRouteAccess({
        user: null,
        isLoading: true,
        requireSuperAdmin: false,
      })
    ).toBe('loading');

    expect(
      getRouteAccess({
        user: { email: 'admin@example.com', role: 'super_admin' },
        isLoading: true,
        requireSuperAdmin: true,
      })
    ).toBe('loading');
  });

  it('retorna "login" quando o usuário não está autenticado ou não possui e-mail', () => {
    expect(
      getRouteAccess({
        user: null,
        isLoading: false,
        requireSuperAdmin: false,
      })
    ).toBe('login');

    expect(
      getRouteAccess({
        user: { email: null, role: null },
        isLoading: false,
        requireSuperAdmin: false,
      })
    ).toBe('login');

    expect(
      getRouteAccess({
        user: { email: '', role: 'site_admin' },
        isLoading: false,
        requireSuperAdmin: false,
      })
    ).toBe('login');
  });

  it('retorna "unauthorized" quando requireSuperAdmin é true e o usuário não é super_admin', () => {
    // site_admin tentando acessar rota exclusiva de super_admin
    expect(
      getRouteAccess({
        user: { email: 'site@example.com', role: 'site_admin' },
        isLoading: false,
        requireSuperAdmin: true,
      })
    ).toBe('unauthorized');

    // Usuário logado com role null tentando acessar rota exclusiva de super_admin
    expect(
      getRouteAccess({
        user: { email: 'user@example.com', role: null },
        isLoading: false,
        requireSuperAdmin: true,
      })
    ).toBe('unauthorized');
  });

  it('retorna "allow" quando requireSuperAdmin é true e o usuário possui a role super_admin', () => {
    expect(
      getRouteAccess({
        user: { email: 'super@example.com', role: 'super_admin' },
        isLoading: false,
        requireSuperAdmin: true,
      })
    ).toBe('allow');
  });

  it('[COMPORTAMENTO ATUAL — revisar na fase de segurança] retorna "allow" para qualquer admin autenticado quando requireSuperAdmin é false ou omitido', () => {
    // site_admin em rota padrão
    expect(
      getRouteAccess({
        user: { email: 'site@example.com', role: 'site_admin' },
        isLoading: false,
      })
    ).toBe('allow');

    // super_admin em rota padrão
    expect(
      getRouteAccess({
        user: { email: 'super@example.com', role: 'super_admin' },
        isLoading: false,
        requireSuperAdmin: false,
      })
    ).toBe('allow');

    // Usuário autenticado com role null (acesso básico autenticado ao painel)
    expect(
      getRouteAccess({
        user: { email: 'admin@example.com', role: null },
        isLoading: false,
        requireSuperAdmin: false,
      })
    ).toBe('allow');
  });
});
