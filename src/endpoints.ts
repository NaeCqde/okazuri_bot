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
 * DLsite の雑誌・単話の取得(内部用)。取得するレーベルは環境変数 MAGAZINE_IDS(wrangler.jsonc)。
 *
 * DLsite は国外からのアクセスだと一覧から雑誌の号を外す(COMIC快楽天: 日本514件、米国264件)。
 * Workers の cron は placement(wrangler.jsonc)が効かず国外の拠点で動くので使わない。
 * 外部のサーバー(okazuri-search-api の cron など)がこのエンドポイントを呼ぶ(ここが起爆)と、
 * HTTP で入ったリクエストは placement で日本の拠点で動く。
 *
 * 起爆するのは Worker の cron(index.ts の scheduled、毎日)でもよい。cron 自体は国外の拠点で動くが、
 * 自分宛ての fetch は(互換フラグ global_fetch_strictly_public で)外部からのリクエストと同じ扱いになるので、
 * 親はここへ入り直して日本の拠点で動く。外部のサーバー(okazuri-search-api の cron)から呼んでもよい。
 *
 * 呼び出しには2つの動きがある。
 * - 親(chunk なし): 取得するレーベルを順に、自分自身を chunk 付きで呼んで進める
 * - 子(chunk あり): 先頭のレーベルを、1回の呼び出しで許す量(Fetcher の予算)だけ取得する
 * 1回の呼び出しで取れる量には、リクエスト数と CPU 時間の上限がある(CPU 時間は実行中に測れないので、
 * リクエスト数の予算で代わりにしている)。子に分けると、上限は呼び出しごとにリセットされる。
 * 親の側も、サブリクエスト数と時間の上限までで切り上げ、残りは次の起爆に任せる。
 *
 * 自分自身の URL は環境変数 WORKER_URL。自分宛ての fetch は、互換フラグ global_fetch_strictly_public
 * (wrangler.jsonc)がないと、同じゾーンの Worker への fetch として Cloudflare のエラー 1042 で断られる。
 * フラグがあると外部からのリクエストと同じ扱いになり、子も placement で日本の拠点で動く(確認済み)。
 */
export const FETCH_MAGAZINES_PATH = '/internal/fetch-magazines';

/** 親が子を呼ぶ回数の上限(サブリクエストの上限は、無料プランで1回の呼び出しにつき50) */
const MAX_CHUNKS = 40;

/** 親がこの時間を越えたら、新しい子を呼ばずに切り上げる(ミリ秒) */
const DRIVE_MS = 60_000;

interface FetchRequest {
    ids?: unknown;
    chunk?: unknown;
}

interface ChunkResult extends RunResult {
    /** 子が動いた拠点 */
    colo: string;
}

/** 親を起爆する。cron(index.ts)から呼ぶ。取得するレーベルは MAGAZINE_IDS */
export async function triggerFetchMagazines(env: Pick<Env, 'WORKER_URL' | 'CRON_SECRET'>): Promise<void> {
    const resp = await fetch(env.WORKER_URL + FETCH_MAGAZINES_PATH, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const text = await resp.text();

    console.log(`okazuri: fetch-magazines triggered: ${resp.status} ${text.slice(0, 500)}`);

    if (!resp.ok) throw Error(`okazuri: ${FETCH_MAGAZINES_PATH} failed: ${resp.status}`);
}

function safeEqual(a: string, b: string): boolean {
    const x = new TextEncoder().encode(a);
    const y = new TextEncoder().encode(b);

    return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

function colo(request: Request): string {
    return (request as any).cf?.colo ?? '?';
}

function labelIds(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > 50) return null;

    return value.every((id) => typeof id === 'string' && /^LBL\d+$/.test(id)) ? value : null;
}

// 取得の実行。CRON_SECRET が合わなければ 404
endpoints.post(FETCH_MAGAZINES_PATH, async (c) => {
    // CRON_SECRET が未設定のときは、誰も通さない
    if (
        !c.env.CRON_SECRET ||
        !safeEqual(c.req.header('Authorization') ?? '', `Bearer ${c.env.CRON_SECRET}`)
    ) {
        return c.notFound();
    }

    const body = await c.req.json<FetchRequest>().catch(() => ({}) as FetchRequest);
    const ids = labelIds(body.ids ?? c.env.MAGAZINE_IDS);

    if (!ids?.length) return c.json({ message: 'invalid ids' }, 400);

    const here = colo(c.req.raw);

    // 子: 先頭のレーベルを1回分だけ取得する
    if (body.chunk) {
        console.log(`okazuri: chunk at ${here}: ${ids[0]}`);

        const result = await new Fetcher(drizzle(c.env.DB)).run([ids[0]]);

        return c.json({ ...result, colo: here } satisfies ChunkResult);
    }

    // 親: 子を呼んで進める
    const colos = new Set<string>();
    const until = Date.now() + DRIVE_MS;

    console.log(`okazuri: fetch-magazines at ${here}: ${ids.join(',')}`);

    const result = await fetchMagazines(
        async (id) => {
            const resp = await fetch(c.env.WORKER_URL + FETCH_MAGAZINES_PATH, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${c.env.CRON_SECRET}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: [id], chunk: true }),
            });

            if (!resp.ok) {
                const detail = (await resp.text()).slice(0, 200);

                throw Error(`okazuri: chunk failed: ${resp.status} ${resp.headers.get('server')} ${detail}`);
            }

            const chunk = (await resp.json()) as ChunkResult;
            colos.add(chunk.colo);

            return chunk;
        },
        ids,
        { maxChunks: MAX_CHUNKS, until }
    );

    console.log(
        `okazuri: fetch-magazines done: ${JSON.stringify({ ...result, colo: here, chunkColos: [...colos] })}`
    );

    // 取れなかったレーベルがあれば、呼び出した側のログに残るよう 500 にする
    return c.json({ ...result, colo: here, chunkColos: [...colos] }, result.failed.length ? 500 : 200);
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
    },
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
    },
);
