import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const config = {
  matcher: [
    // Run on app routes so we can protect private pages and log page visits.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

function getClientIp(req) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.headers.get('x-real-ip') || 'unknown';
}

function parseUserAgent(userAgent) {
  const ua = userAgent || '';

  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\//.test(ua) ? 'Opera' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari' :
    'Unknown';

  const os =
    /Windows NT/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' :
    'Unknown';

  const device =
    /iPad/.test(ua) ? 'Tablet' :
    /Mobile|iPhone|Android/.test(ua) ? 'Mobile' :
    'Desktop';

  return { browser, os, device };
}

function getPageLabel(pathname) {
  if (pathname.startsWith('/share/')) {
    return `Shared note (${pathname.split('/')[2] || 'unknown'})`;
  }

  if (pathname === '/') return 'Dashboard';
  if (pathname === '/login') return 'Login';
  if (pathname === '/register') return 'Register';

  return pathname;
}

function shouldLogVisit(req) {
  const pathname = req.nextUrl.pathname;
  const accept = req.headers.get('accept') || '';

  if (req.method !== 'GET') return false;
  if (pathname.startsWith('/api/')) return false;
  if (req.headers.get('purpose') === 'prefetch') return false;
  if (req.headers.get('next-router-prefetch')) return false;
  if (req.headers.get('rsc')) return false;

  return accept.includes('text/html');
}

function logVisit(req, session) {
  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search || '';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const { browser, os, device } = parseUserAgent(userAgent);
  const ip = getClientIp(req);
  const username = session?.username ? String(session.username) : null;

  console.log(
    [
      '',
      '================ Website Visit ================',
      `Time: ${new Date().toISOString()}`,
      `Page: ${getPageLabel(pathname)}`,
      `Path: ${pathname}${search}`,
      `Auth: ${username ? `Logged in as ${username}` : 'Guest'}`,
      `IP: ${ip}`,
      `Browser: ${browser}`,
      `OS: ${os}`,
      `Device: ${device}`,
      `User-Agent: ${userAgent}`,
      '==============================================',
    ].join('\n')
  );
}

export async function middleware(req) {
  const pathname = req.nextUrl.pathname;
  const token = req.cookies.get('token')?.value;
  const isPublicPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/share/');
  const isPublicApi =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/images');
  const isProtectedRoute = !isPublicPage && !isPublicApi;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  let session = null;
  let tokenIsValid = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      session = payload;
      tokenIsValid = true;
    } catch {
      tokenIsValid = false;
    }
  }

  if (shouldLogVisit(req)) {
    logVisit(req, session);
  }

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!token) {
    const url = req.nextUrl.clone();
    url.searchParams.set('next', req.nextUrl.pathname + (req.nextUrl.search || ''));
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (tokenIsValid) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  const res = NextResponse.redirect(url);
  res.cookies.delete('token');
  return res;
}