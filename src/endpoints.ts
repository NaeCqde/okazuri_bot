// Workers が公開する HTTP の API(検索・内部の取得)。Discord の /interaction は index.ts
import { sValidator } from '@hono/standard-validator';
import { type } from 'arktype';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono/tiny';
import { Fetcher, fetchMagazines, type RunResult } from './magazines';
import * as bingImages from './search/bing/images';
import * as bing from './search/bing/search';
import * as googleImages from './search/google/images';
import * as google from './search/google/search';
import type { EnvTypes } from './types';

export const endpoints = new Hono<EnvTypes>();

/**
 * DLsite の雑誌・単話の取得(内部用)。
 *
 * DLsite は国外からのアクセスだと一覧から雑誌の号を外す(COMIC快楽天: 日本514件、米国264件)。
 * cron やサービスバインディング(RPC)は placement(wrangler.jsonc)が効かず国外の拠点で動くが、
 * HTTP で入ってくるリクエスト(fetch)は placement で日本の拠点で動き、DLsite にも日本として見える。
 * そこで cron から自分自身の URL(SELF_URL)を HTTP で呼び、取得はそちらで実行する。
 * 呼び出しごとにリクエスト数(サブリクエスト)の上限もリセットされるので、1レーベルずつ呼ぶ。
 */
export const FETCH_MAGAZINES_PATH = '/internal/fetch-magazines';

/** cron から呼ぶ側。FETCH_MAGAZINES_PATH を、レーベルごとに1回ずつ呼ぶ */
export async function fetchMagazinesViaHttp(
    env: Pick<Env, 'SELF_URL' | 'CRON_SECRET'>,
    magazineIds?: string[]
): Promise<void> {
    await fetchMagazines(async (ids) => {
        const resp = await fetch(env.SELF_URL + FETCH_MAGAZINES_PATH, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.CRON_SECRET}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });

        if (!resp.ok) throw Error(`okazuri: ${FETCH_MAGAZINES_PATH} failed: ${resp.status}`);

        return (await resp.json()) as RunResult;
    }, magazineIds);
}

function safeEqual(a: string, b: string): boolean {
    const x = new TextEncoder().encode(a);
    const y = new TextEncoder().encode(b);

    return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

// 取得の実行(cron から呼ばれる)。CRON_SECRET が合わなければ 404
endpoints.post(FETCH_MAGAZINES_PATH, async (c) => {
    // CRON_SECRET が未設定のときは、誰も通さない
    if (
        !c.env.CRON_SECRET ||
        !safeEqual(c.req.header('Authorization') ?? '', `Bearer ${c.env.CRON_SECRET}`)
    ) {
        return c.notFound();
    }

    const { ids } = await c.req.json<{ ids: string[] }>();
    console.log(`okazuri: fetch-magazines at ${(c.req.raw as any).cf?.colo ?? '?'}: ${ids.join(',')}`);

    if (!Array.isArray(ids) || ids.length > 20 || !ids.every((id) => /^LBL\d+$/.test(id))) {
        return c.json({ message: 'invalid ids' }, 400);
    }

    return c.json(await new Fetcher(drizzle(c.env.DB)).run(ids));
});

// 検索 API
const param = type({
    engine: '"google" | "bing"',
});
const query = type({
    q: '0 < string <= 150',
    'start?': 'number.integer >= 0',
});

endpoints.get(
    '/:engine/search',
    sValidator('param', param),
    sValidator('query', query),
    async (c) => {
        const { engine } = c.req.valid('param');
        let { q, start } = c.req.valid('query');
        if (!start) start = 0;
        switch (engine) {
            case 'google':
                return c.json(await google.search(q, start));
            case 'bing':
                return c.json(await bing.search(q, start));
        }
    }
);

endpoints.get(
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
