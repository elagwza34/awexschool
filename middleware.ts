import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // مسارات متاحة للزوار وغير المسجلين فقط
  const authRoutes = ["/login", "/register", "/account"];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // مسارات بوابات الأدوار (تتطلب تسجيل دخول)
  const portalRoutes = [
    "/student",
    "/teacher",
    "/parent",
    "/admin",
    "/manager",
    "/support",
  ];
  const isPortalRoute = portalRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // مسارات إدارية صارمة
  const adminRoutes = ["/admin", "/manager"];
  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // إذا لم يكن هناك مستخدم وحاول الوصول لبوابة أو مسار محمي
  if (!user && isPortalRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // إذا كان مستخدم مسجل وحاول الوصول لصفحات المصادقة، ارجع إلى الرئيسية
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // إذا كان هناك مستخدم وحاول الوصول لمسار إداري، تحقق من الدور
  if (user && isAdminRoute) {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // جلب أدوار المستخدم من جدول account_roles
    const { data: roles } = await supabase
      .from("account_roles")
      .select("role_code")
      .eq("user_id", currentUser?.id);

    const userRoles = roles?.map((r) => r.role_code) ?? [];
    const isAdminOrManager =
      userRoles.includes("admin") ||
      userRoles.includes("manager") ||
      userRoles.includes("owner");

    if (!isAdminOrManager) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("message", "denied");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};