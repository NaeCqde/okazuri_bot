import type { CommandContext } from 'discord-hono';
import { drizzle } from 'drizzle-orm/d1';
import { ERROR_MESSAGE } from './consts';
import { createErrorLog, resultToText, splitText } from './formatter';
import { toNumber } from './magazines';
import { rewrite } from './rewriter';
import { searchMultiple } from './search/search';
import type { SearchResultMap } from './types';

export async function searchHandler(
    ctx: CommandContext,
    queries: string[],
    rewriteLevel: 0 | 1 | 2 = 0,
    toMagazine: boolean = false,
    cmd: string = 'search'
): Promise<void> {
    const db = drizzle(ctx.env.DB);
    let result: SearchResultMap;

    try {
        for (const [i, q] of Object.entries(queries)) {
            if (toMagazine) queries[Number(i)] = (await toNumber(db, q)).name;
            if (rewriteLevel) {
                queries[Number(i)] = await rewrite(ctx.env.OKAZURI_API_URL, q, rewriteLevel);
            }
        }

        result = await searchMultiple(queries);
    } catch (e: any) {
        await ctx.followup({
            content: ERROR_MESSAGE,
            allowed_mentions: {
                parse: [],
            },
        });

        await fetch(ctx.env.ERROR_LOG_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: createErrorLog(queries, cmd, toMagazine, e as Error),
            }),
        });
        return;
    }

    const contents = splitText(resultToText(result, rewriteLevel ? queries : null));

    for (const content of contents) {
        await ctx.flags('SUPPRESS_EMBEDS').followup({
            content,
            allowed_mentions: {
                parse: [],
            },
        });
    }
}
