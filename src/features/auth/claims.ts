export type Role = 'super_admin' | 'site_admin' | null;

export const mapClaims = (
  claims?: Record<string, unknown> | null,
): { role: Role; siteId?: string } => {
  if (!claims) {
    return { role: null };
  }
  const rawRole = claims.role;
  const role: Role = rawRole === 'super_admin' || rawRole === 'site_admin' ? rawRole : null;
  const siteId = typeof claims.siteId === 'string' ? claims.siteId : undefined;
  return { role, siteId };
};
