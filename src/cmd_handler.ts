import type { CommandContext, ComponentContext } from 'discord-hono';
import { drizzle } from 'drizzle-orm/d1';
import { ERROR_MESSAGE } from './consts';
import { createErrorLog, resultToText, splitText } from './formatter';
import { NotFoundError, toNumber } from './magazines';
import { reply } from './reply';
import { rewrite } from './rewriter';
import { searchMultiple, titleByUrl } from './search/search';
import type { SearchResultMap } from './types';

/** URL からタイトルを取る。対応していないサイトや取れなかったURLは除く */
export async function titlesFromUrls(urls: string[]): Promise<string[]> {
    const titles = await Promise.all(urls.map((url) => titleByUrl(url).catch(() => '')));

    return titles.filter(Boolean);
}

/**
 * 検索して、結果を送る。
 * editOriginal は reply と同じ。元のメッセージを残したいとき(設定付き検索の確定後)は false
 */
export async function searchHandler(
    ctx: CommandContext | ComponentContext,
    originalQueries: string[],
    rewriteLevel: 0 | 1 | 2 = 0,
    toMagazine: boolean = false,
    cmd: string = 'search',
    editOriginal: boolean = true
): Promise<void> {
    const db = drizzle(ctx.env.DB);
    const queries = [...originalQueries];
    let result: SearchResultMap;

    try {
        for (const [i, original] of originalQueries.entries()) {
            let query = original;

            if (toMagazine) query = (await toNumber(db, query)).name;
            if (rewriteLevel) query = await rewrite(ctx.env.OKAZURI_API_URL, query, rewriteLevel);

            queries[i] = query;
        }

        result = await searchMultiple(queries);
    } catch (e: any) {
        // 掲載されている雑誌がないのは入力の問題なので、開発者には通知しない
        if (e instanceof NotFoundError) {
            await reply(
                ctx,
                ['掲載されている雑誌が見つかりませんでした。作品名を確認してください。'],
                editOriginal
            );

            return;
        }

        await reply(ctx, [ERROR_MESSAGE], editOriginal);

        await fetch(ctx.env.ERROR_LOG_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: createErrorLog(originalQueries, cmd, toMagazine, e as Error),
            }),
        });
        return;
    }

    // 検索語を変えたときは、元のクエリも示す
    const changed = rewriteLevel > 0 || toMagazine;

    await reply(
        ctx,
        splitText(resultToText(result, changed ? originalQueries : null)),
        editOriginal
    );
}
