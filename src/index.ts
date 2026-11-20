import { Hono } from 'hono/tiny';
import * as handlers from './cmd';
import { proxyApi } from './api-proxy';
import { endpoints, triggerFetchMagazines } from './endpoints';
import { factory } from './init';
import type { EnvTypes } from './types';

const bot = factory
    // @ts-ignore
    .discord({ discordEnv: (env) => ({ ...env, TOKEN: env.BOT_TOKEN }) })
    .loader(Object.values(handlers));

const hono = new Hono<EnvTypes>();
hono.mount('/interaction', bot.fetch.bind(bot));
// 新しい入口: https://okazuri.nae.quest/api/bot/interaction(/api/* の API プロキシより先に置く)
hono.mount('/api/bot/interaction', bot.fetch.bind(bot));
hono.all('/api/v1/*', proxyApi);
// /api/bot/internal/* は /internal/* と同じ(cron などの内部用)
hono.all('/api/bot/internal/*', (c) => {
    const url = new URL(c.req.url);
    url.pathname = url.pathname.replace(/^\/api\/bot/, '');
    return hono.fetch(new Request(url, c.req.raw), c.env, c.executionCtx);
});
hono.get('/api', (c) => c.redirect('/dev/', 302));
hono.get('/api/v1', (c) => c.redirect('/dev/', 302));
hono.route('/', endpoints);

export default {
    fetch: hono.fetch,
    // 毎日、DLsite の差分取得を起爆する(wrangler.jsonc の triggers.crons)
    scheduled: async (_event: ScheduledController, env: Env) => {
        await triggerFetchMagazines(env);
    },
};
