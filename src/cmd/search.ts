import { ApplicationCommandType, ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { Command, CommandContext, Option } from 'discord-hono';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../consts.js';
import { createErrorLog, resultToText, splitText } from '../formatter.js';
import { factory } from '../init.js';
import { toNumber } from '../magazines.js';
import { rewrite } from '../rewriter.js';
import { searchMultiple } from '../search/search.js';
import type { CommandSet, SearchResultMap } from '../types.js';

export const searchCommand: CommandSet = factory.command(
    new Command('search', 'Search')
        .description_localizations({ [Locale.Japanese]: '検索します' })
        .type(ApplicationCommandType.ChatInput)
        .integration_types(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .options(
            new Option('query', 'Please enter a title or URL', 'String')
                .name_localizations({ [Locale.Japanese]: 'クエリ' })
                .description_localizations({
                    [Locale.Japanese]: 'タイトルまたはURLを入力してください',
                })
                .required(true),
            /*Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = 'タイトルまたはURLを入力してください';
                    } else {
                        data[key] = 'Please enter a title or URL';
                    }
                    return data;
                }, {} as Record<Locale, string>),*/
            new Option(
                'focus_on_illegal',
                'Rewrite the query to focus on illegal content',
                'Integer'
            )
                .description_localizations({
                    [Locale.Japanese]: '違法コンテンツに焦点を当てるクエリに書き換えます',
                })
                .choices(
                    { name: 'Off', name_localizations: { [Locale.Japanese]: 'オフ' }, value: 0 },
                    { name: 'Weak', name_localizations: { [Locale.Japanese]: '弱' }, value: 1 },
                    {
                        name: 'Strong:Default',
                        name_localizations: { [Locale.Japanese]: '強:初期値' },
                        value: 2,
                    }
                )
                .min_value(0)
                .max_value(2)
                .required(false),
            new Option('to_magazine', 'Find the magazine in which this work appears', 'Boolean')
                .description_localizations({
                    [Locale.Japanese]: 'この作品が掲載されている雑誌を探します',
                })
                .required(false)
        ),
    async (ctx: CommandContext): Promise<Response> => {
        if (ctx.var['query']) {
            const rewriteLevel: 0 | 1 | 2 = ctx.var['focus_on_illegal'];
            const toMagazine: boolean = ctx.var['to_magazine'];
            const originalQuery: string = ctx.var['query'];

            return ctx.resDefer(
                (ctx: CommandContext): Promise<void> =>
                    searchCallback(ctx, [originalQuery], rewriteLevel, toMagazine)
            );
        }

        return ctx.res(ERROR_RESPONSE);
    }
);

export async function searchCallback(
    ctx: CommandContext,
    queries: string[],
    rewriteLevel: 0 | 1 | 2 = 0,
    toMagazine: boolean = false,
    cmd: string = 'search'
): Promise<void> {
    let result: SearchResultMap;

    try {
        for (const [i, q] of Object.entries(queries)) {
            if (rewriteLevel && !toMagazine) {
                queries[Number(i)] = await rewrite(q, rewriteLevel);
            }

            if (toMagazine) queries[Number(i)] = (await toNumber(q)).name;
            if (rewriteLevel && toMagazine) {
                queries[Number(i)] = await rewrite(q, rewriteLevel);
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
