/////// web/middleware.ts
// web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // 🌍 Récupération de la langue depuis le cookie (configuré par i18next)
  const locale = request.cookies.get('i18next')?.value || 'fr';

  // 🌍 Récupération du domaine (Tenant) pour le Multi-Tenancy visuel
  let hostname = request.headers.get('host') || '';

  // 🔥 MAPPING CHIRURGICAL POUR TON VERCEL PERSO (Bypass Auth-Blocked & Tenant 404)
  // On masque l'identité de ton Vercel de dev pour qu'il se fasse passer pour le client EXACT (avec www.)
  if (hostname === 'lcd-comminity.vercel.app' || hostname.includes('vercel.app')) {
    hostname = 'www.leloumacommunity.com';
  }

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

  // 5. Injection des headers pour les Server Components et le Proxy
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-domain', hostname);
  
  // 🔥 Force l'Origin pour le proxy afin de satisfaire le backend Render
  if (hostname === 'www.leloumacommunity.com') {
    requestHeaders.set('origin', 'https://www.leloumacommunity.com');
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 🌍 On injecte la langue dans les cookies si elle n'y est pas
  if (!request.cookies.has('i18next')) {
    response.cookies.set('i18next', locale);
  }
  
  return response;
}

export const config = {
  matcher: [
    '/system-admin/:path*',
    '/super-admin/:path*',
    '/admin/:path*',
    '/member/:path*',
    '/login',
    '/',
    '/api/:path*' 
  ],
};