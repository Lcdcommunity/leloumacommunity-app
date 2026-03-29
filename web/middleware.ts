// web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Identification des zones protégées
  const isSystemAdminRoute = pathname.startsWith('/system-admin');
  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMemberRoute = pathname.startsWith('/member');

  const isProtectedRoute = 
    isSystemAdminRoute || 
    isSuperAdminRoute || 
    isAdminRoute || 
    isMemberRoute;

  if (isProtectedRoute) {
    // 2. Récupération du token depuis les cookies
    // Remplace 'accessToken' par le nom exact de ton cookie si différent
    const token = request.cookies.get('accessToken')?.value;

    if (!token) {
      // Pas de token = Expulsion vers la page de connexion
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // 3. Décodage du payload JWT (Compatible Edge Runtime)
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      const userRole = payload.role;

      // 4. Vérifications chirurgicales des rôles (Hiérarchie descendante)
      
      // Le Grand Chef (Seul le SYSTEM_ADMIN passe)
      if (isSystemAdminRoute && userRole !== 'SYSTEM_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // Le Super Admin de l'association (SYSTEM_ADMIN et SUPER_ADMIN passent)
      if (isSuperAdminRoute && userRole !== 'SUPER_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // L'Admin d'Antenne (La hiérarchie supérieure passe aussi)
      if (isAdminRoute && userRole !== 'ANTENNA_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // L'espace Membre (Tout le monde passe sauf les comptes non validés)
      if (isMemberRoute && !['MEMBER', 'ANTENNA_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

    } catch { 
      // ^^^ La correction chirurgicale ultime : plus de parenthèses du tout !
      // Si le token est trafiqué ou corrompu
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// 5. Configuration pour dire à Next.js quelles routes surveiller
export const config = {
  matcher: [
    '/system-admin/:path*',
    '/super-admin/:path*',
    '/admin/:path*',
    '/member/:path*'
  ],
};