import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];
const IGNORED_PREFIXES = ['/_next', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and Next.js internals
  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow public auth routes
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow all /api/auth sub-routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get('sigaa-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token structure (full verification happens in API routes since
  // Edge middleware cannot use jsonwebtoken directly; here we check presence
  // and basic JWT format: three base64 segments separated by dots)
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
