import type { Context } from 'hono';
import type { EnvTypes } from './types';

/**
 * https://okazuri.nae.quest/api/<path> -> okazuri-search-api の /<path>。
 * Cloudflare のキャッシュを効かせるため、Worker 経由にして cacheEverything で取る。
 * 保持する時間はサーバーの Cache-Control(s-maxage)に従う(200 だけ。live=on やエラーは no-store)。
 */
export async function proxyApi(c: Context<EnvTypes>): Promise<Response> {
    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        return c.json({ detail: 'method not allowed' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
    }
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' };
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(c.req.url);
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const base = new URL(c.env.OKAZURI_API_URL);
    // `//host/...` や `\\host` はスキーム相対 URL として解釈され、別のホストへ転送されてしまう(SSRF)。
    const origin = new URL(base);
    origin.pathname = '/' + path.replace(/^[/\\]+/, '');
    origin.search = url.search;
    if (origin.origin !== base.origin) return c.json({ detail: 'bad request' }, 400);
    const upstream = await fetch(origin, {
        method,
        headers: { Accept: c.req.header('Accept') ?? '*/*' },
        cf: { cacheEverything: true },
    });

    const headers = new Headers(upstream.headers);
    headers.delete('set-cookie');
    for (const [name, value] of Object.entries(cors)) headers.set(name, value);
    return new Response(upstream.body, { status: upstream.status, headers });
}
