// web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // 1. Identification des zones
  const isSystemAdminRoute = pathname.startsWith('/system-admin');
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMemberRoute = pathname.startsWith('/member');
  const isPublicRoute = pathname === '/login' || pathname === '/signup' || pathname === '/';

  const isProtectedRoute = isSystemAdminRoute || isSuperAdminRoute || isAdminRoute || isMemberRoute;

  // 2. Logique pour les utilisateurs NON connectés
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Logique pour les utilisateurs DÉJÀ connectés (Auto-redirection)
  if (token && isPublicRoute && pathname !== '/signup') {
    try {
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64));
      const userRole = payload.role;

      // On les envoie vers leur dashboard respectif
      if (userRole === 'SYSTEM_ADMIN') return NextResponse.redirect(new URL('/system-admin', request.url));
      if (userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/super-admin', request.url));
      if (userRole === 'ANTENNA_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      if (userRole === 'MEMBER') return NextResponse.redirect(new URL('/member', request.url));
    } catch {
      // Token invalide : on laisse l'accès public
    }
  }

  // 4. Vérifications chirurgicales des rôles pour les routes protégées
  if (isProtectedRoute && token) {
    try {
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64));
      const userRole = payload.role;

      if (isSystemAdminRoute && userRole !== 'SYSTEM_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      if (isSuperAdminRoute && !['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      if (isAdminRoute && !['ANTENNA_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      if (isMemberRoute && !['MEMBER', 'ANTENNA_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/system-admin/:path*',
    '/super-admin/:path*',
    '/admin/:path*',
    '/member/:path*',
    '/login',
    '/'
  ],
};