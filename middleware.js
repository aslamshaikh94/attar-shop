import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
export async function middleware(request) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && !user) {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
    }
    if (!user && request.nextUrl.pathname !== '/login') {
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.search = '';
        loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
        const redirectResponse = NextResponse.redirect(loginUrl);
        response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
        return redirectResponse;
    }
    if (user && request.nextUrl.pathname === '/login') {
        const next = request.nextUrl.searchParams.get('next');
        const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
        const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
        response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
        return redirectResponse;
    }
    return response;
}
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
