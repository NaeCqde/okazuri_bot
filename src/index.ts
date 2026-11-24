import { Hono } from 'hono/tiny';
import * as handlers from './cmd';
import { endpoints, triggerFetchMagazines } from './endpoints';
import { factory } from './init';
import type { EnvTypes } from './types';

const bot = factory
    // @ts-ignore
    .discord({ discordEnv: (env) => ({ ...env, TOKEN: env.BOT_TOKEN }) })
    .loader(Object.values(handlers));

const hono = new Hono<EnvTypes>();
// Discord の Interactions Endpoint URL: https://okazuri.nae.quest/api/bot/interaction
hono.mount('/api/bot/interaction', bot.fetch.bind(bot));
// These come before the endpoints, whose /:engine/search would take /ja/search.
// The search page is a static asset; with ?q= the title of the link embed (Open Graph) names the searched words
hono.get('/search', (c) => searchPage(c.req.raw, c.env, false));
hono.get('/ja/search', (c) => searchPage(c.req.raw, c.env, true));
hono.route('/', endpoints);

const MAX_TITLE_QUERIES = 3;
const MAX_QUERY_CHARS = 40;

async function searchPage(request: Request, env: Env, ja: boolean): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const queries = url.searchParams
        .getAll('q')
        .map((q) => q.trim().slice(0, MAX_QUERY_CHARS))
        .filter(Boolean)
        .slice(0, MAX_TITLE_QUERIES);
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html') || !queries.length) return response;
    const title = ja ? `${queries.map((q) => `「${q}」`).join('')}の検索結果 | オカズリBOT` : `Search results for ${queries.map((q) => `"${q}"`).join(', ')} | Okazuri BOT`;
    const pageUrl = `${url.origin}${url.pathname}${url.search}`;
    return new HTMLRewriter()
        .on('title', { element: (e) => void e.setInnerContent(title) })
        .on('meta[property="og:title"], meta[name="twitter:title"]', { element: (e) => void e.setAttribute('content', title) })
        .on('meta[property="og:url"]', { element: (e) => void e.setAttribute('content', pageUrl) })
        .transform(response);
}

export default {
    fetch: hono.fetch,
    // 毎日、DLsite の差分取得を起爆する(wrangler.jsonc の triggers.crons)
    scheduled: async (_event: ScheduledController, env: Env) => {
        await triggerFetchMagazines(env);
    },
};
