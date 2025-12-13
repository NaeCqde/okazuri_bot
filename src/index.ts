import { sValidator } from '@hono/standard-validator';
import { type } from 'arktype';
import { Hono } from 'hono/tiny';
import * as handlers from './cmd';
import { factory } from './init';
import { Fetcher } from './magazines';
import * as bingImages from './search/bing/images';
import * as bing from './search/bing/search';
import * as googleImages from './search/google/images';
import * as google from './search/google/search';
import type { EnvTypes } from './types';

const bot = factory
    // @ts-ignore
    .discord({ discordEnv: (env) => ({ ...env, TOKEN: env.BOT_TOKEN }) })
    .loader(Object.values(handlers));

bot.cron('0 0 * * *', async () => {
    await new Fetcher().run(['LBL00611']);
});

const hono = new Hono<EnvTypes>();
hono.mount('/interaction', bot.fetch);

const param = type({
    engine: '"google" | "bing"',
});
const query = type({
    q: '0 < string <= 150',
    'start?': 'number.integer >= 0',
});

hono.get('/:engine/search', sValidator('param', param), sValidator('query', query), async (c) => {
    const { engine } = c.req.valid('param');
    let { q, start } = c.req.valid('query');
    if (!start) start = 0;
    switch (engine) {
        case 'google':
            return c.json(await google.search(q, start));
        case 'bing':
            return c.json(await bing.search(q, start));
    }
});

hono.get(
    '/:engine/images/search',
    sValidator('param', param),
    sValidator('query', query),
    async (c) => {
        const { engine } = c.req.valid('param');
        let { q, start } = c.req.valid('query');
        if (!start) start = 0;
        switch (engine) {
            case 'google':
                return c.json(await googleImages.search(q, start));
            case 'bing':
                return c.json(await bingImages.search(q, start));
        }
    }
);

const redirectQuery = type({
    urls: 'string > 0[] > 0',
});

hono.post('/bing/redirect', sValidator('json', redirectQuery), async (c) => {
    const { urls } = c.req.valid('json');
    let results: string[] = [];

    for (const [i, url] of Object.entries(urls)) {
        try {
            results.push(await bing.getLocation(url));
        } catch {
            return c.json({ message: 'Failed to get redirect location: index-' + i }, 400);
        }
    }

    return c.json(results);
});

export default {
    fetch: hono.fetch,
    scheduled: bot.scheduled,
};
