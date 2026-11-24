const portalRoute = /^\/(?:student|teacher|parent|admin|manager|support|workspace)(?:\/|$)/;
const adminRoute = /^\/(?:admin|manager)(?:\/|$)/;
const authRoute = /^\/(?:login|register)(?:\/|$)/;
const adminRoles = new Set(["admin", "manager", "owner"]);

export type RouteAccess = {
  authenticated: boolean;
  roles: readonly string[];
};

export function routeAccessRedirect(pathname: string, access: RouteAccess) {
  if (authRoute.test(pathname) && access.authenticated) return "/";
  if (!portalRoute.test(pathname)) return null;
  if (!access.authenticated) return `/login?next=${encodeURIComponent(pathname)}`;
  if (adminRoute.test(pathname) && !access.roles.some((role) => adminRoles.has(role))) {
    return "/?message=denied";
  }
  return null;
}
