const portalRoute = /^\/(?:student|teacher|parent|admin|manager|support|customer-service|workspace)(?:\/|$)/;
const adminRoute = /^\/(?:admin|manager)(?:\/|$)/;
const customerServiceRoute = /^\/customer-service(?:\/|$)/;
const authRoute = /^\/(?:login|register)(?:\/|$)/;
const adminRoles = new Set(["admin", "manager", "owner"]);

export type RouteAccess = {
  authenticated: boolean;
  roles: readonly string[];
};

export type SessionVerificationMode = "none" | "user" | "roles";

export function sessionVerificationMode(pathname: string): SessionVerificationMode {
  if (pathname === "/owner") return "roles";
  if (adminRoute.test(pathname) || customerServiceRoute.test(pathname)) return "roles";
  if (portalRoute.test(pathname) || authRoute.test(pathname)) return "user";
  return "none";
}

export function routeAccessRedirect(pathname: string, access: RouteAccess) {
  if (authRoute.test(pathname) && access.authenticated) return "/";
  if (pathname === "/owner") {
    return !access.authenticated ? "/login?next=%2Fowner" : access.roles.includes("owner") ? null : "/?message=denied";
  }
  if (!portalRoute.test(pathname)) return null;
  if (!access.authenticated) return `/login?next=${encodeURIComponent(pathname)}`;
  if (customerServiceRoute.test(pathname) && !access.roles.includes("customer_service")) {
    return "/?message=denied";
  }
  if (adminRoute.test(pathname) && !access.roles.some((role) => adminRoles.has(role))) {
    return "/?message=denied";
  }
  return null;
}
