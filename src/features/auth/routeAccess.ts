export type RouteAccess = 'loading' | 'login' | 'unauthorized' | 'allow';

export interface RouteAccessOptions {
  user: { email?: string | null; role?: string | null } | null;
  isLoading: boolean;
  requireSuperAdmin?: boolean;
}

export const getRouteAccess = ({
  user,
  isLoading,
  requireSuperAdmin = false,
}: RouteAccessOptions): RouteAccess => {
  if (isLoading) {
    return 'loading';
  }

  if (!user || !user.email) {
    return 'login';
  }

  if (requireSuperAdmin && user.role !== 'super_admin') {
    return 'unauthorized';
  }

  return 'allow';
};
