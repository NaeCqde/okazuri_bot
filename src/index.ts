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
hono.mount('/interaction', bot.fetch.bind(bot));
hono.route('/', endpoints);

export default {
    fetch: hono.fetch,
    // 毎日、DLsite の差分取得を起爆する(wrangler.jsonc の triggers.crons)
    scheduled: async (_event: ScheduledController, env: Env) => {
        await triggerFetchMagazines(env);
    },
};
