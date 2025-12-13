// レーベル名 and No.**を入力して作品一覧を表示する
import { ApplicationCommandType, ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { Command, CommandContext, Option } from 'discord-hono';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../../consts.js';
import { Work } from '../../db/schema.js';
import { createErrorLog, splitText } from '../../formatter.js';
import { factory } from '../../init.js';
import { listWorks } from '../../magazines.js';
import type { CommandSet } from '../../types.js';

export const worksCommand: CommandSet = factory.command(
    new Command('works', 'Show a list of works published in the magazine')
        .description_localizations({
            [Locale.Japanese]: '雑誌に掲載されている作品一覧を表示します',
        })
        .type(ApplicationCommandType.ChatInput)
        .integration_types(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .options(
            new Option('magazine', 'Please enter the magazine', 'String')
                .name_localizations({ [Locale.Japanese]: '雑誌' })
                .description_localizations({
                    [Locale.Japanese]: '雑誌を入力してください',
                })
                .required(true)
        ),
    async (ctx: CommandContext): Promise<Response> => {
        if (ctx.var['magazine']) {
            const magazine: string = ctx.var['magazine'];

            return ctx.resDefer(async (ctx: CommandContext): Promise<void> => {
                let works: Work[];

                try {
                    works = await listWorks(magazine);
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
                            content: createErrorLog([magazine], 'works', false, e as Error),
                        }),
                    });

                    return;
                }

                const content: string[] = works.map(
                    (work) =>
                        `[${work.name}](https://www.dlsite.com/books/work/=/product_id/${work.id}.html)`
                );

                for (const c of splitText(content)) {
                    await ctx.flags('SUPPRESS_EMBEDS').followup({
                        content: c,
                        allowed_mentions: {
                            parse: [],
                        },
                    });
                }
            });
        }

        return ctx.res(ERROR_RESPONSE);
    }
);
