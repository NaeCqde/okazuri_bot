import { Hono } from 'hono/tiny';
import * as handlers from './cmd';
import { endpoints, fetchMagazinesViaHttp } from './endpoints';
import { factory } from './init';
import type { EnvTypes } from './types';

const bot = factory
    // @ts-ignore
    .discord({ discordEnv: (env) => ({ ...env, TOKEN: env.BOT_TOKEN }) })
    .loader(Object.values(handlers));

// 取得対象のレーベルは MAGAZINE_IDS(src/magazines.ts)
bot.cron('0 0 * * *', async (c) => {
    await fetchMagazinesViaHttp(c.env);
});

const hono = new Hono<EnvTypes>();
hono.mount('/interaction', bot.fetch.bind(bot));
hono.route('/', endpoints);

export default {
    fetch: hono.fetch,
    scheduled: bot.scheduled.bind(bot),
};
