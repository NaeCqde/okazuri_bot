import type { CommandContext, ComponentContext } from 'discord-hono';
import { drizzle } from 'drizzle-orm/d1';
import { ERROR_MESSAGE } from './consts';
import { MAX_REPLY_MESSAGES } from './consts';
import { createErrorLog, resultToText, splitTextWithin } from './formatter';
import { NotFoundError, toNumber } from './magazines';
import { reply } from './reply';
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
    toMagazine: boolean = false,
    cmd: string = 'search',
    editOriginal: boolean = true
): Promise<void> {
    const db = drizzle(ctx.env.DB);
    const queries = [...originalQueries];
    // 見出しに出す名前。雑誌のときは雑誌の名前、そうでなければ入力された語
    const names = [...originalQueries];
    let result: SearchResultMap;
    let english: (string | null)[];

    try {
        for (const [i, original] of originalQueries.entries()) {
            let query = original;

            if (toMagazine) {
                const name = (await toNumber(db, query)).name;

                names[i] = name;
                query = name.replaceAll(/年|月号?/g, " ");
            }

            queries[i] = query;
        }

        // 英語訳は API が取り、その題名の作品も結果に入れている
        ({ resultMap: result, english } = await searchMultiple(ctx.env.OKAZURI_API_URL, queries));
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

    // 見出しは入力された語(雑誌のときは雑誌の名前)。検索は重複を除いて順に行うので、見出しも同じ順に合わせる。
    // ローマ字の行は、API に渡した語(雑誌の名前の「年」「月号」は空白にしたもの)とローマ字に差があるときだけ付ける
    const sent = [...new Set(queries)];
    const headings = sent.map((q) => names[queries.indexOf(q)]);

    await reply(ctx, splitTextWithin(resultToText(result, headings, english, sent), MAX_REPLY_MESSAGES), editOriginal);
}
