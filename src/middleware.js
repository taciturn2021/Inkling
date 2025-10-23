import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const config = {
  matcher: [
    // Protect everything except auth pages and static assets
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
};
export async function middleware(req) {
  const token = req.cookies.get('token')?.value;

  // Allow access if token missing only on public paths (handled by matcher), otherwise redirect
  if (!token) {
    const url = req.nextUrl.clone();
    // Avoid redirect loops
    if (url.pathname !== '/login' && url.pathname !== '/register') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Verify the JWT when present; on failure, clear cookie and redirect to login
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    res.cookies.delete('token');
    return res;
  }
}