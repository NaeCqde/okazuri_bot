// 作品名からレーベル名 and No.を表示する
import { ApplicationCommandType, ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { Command, CommandContext, Option } from 'discord-hono';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../../consts.js';
import type { Number } from '../../db/schema.js';
import { createErrorLog } from '../../formatter.js';
import { factory } from '../../init.js';
import { toNumber } from '../../magazines.js';
import type { CommandSet } from '../../types.js';

export const fromWorkCommand: CommandSet = factory.command(
    new Command('from_work', 'Search for magazine by title')
        .description_localizations({
            [Locale.Japanese]: 'タイトルから雑誌を検索します',
        })
        .type(ApplicationCommandType.ChatInput)
        .integration_types(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .options(
            new Option('title', 'Please enter a title', 'String')
                .name_localizations({ [Locale.Japanese]: 'タイトルを入力してください' })
                .required(true)
        ),
    async (ctx: CommandContext): Promise<Response> => {
        if (ctx.var['title']) {
            return ctx.resDefer(async (ctx: CommandContext): Promise<void> => {
                const title: string = ctx.var['title'];
                let number: Number;

                try {
                    number = await toNumber(title);
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
                            content: createErrorLog([title], 'from_work', true, e as Error),
                        }),
                    });

                    return;
                }

                await ctx.flags('SUPPRESS_EMBEDS').followup({
                    content: number.name,
                    allowed_mentions: {
                        parse: [],
                    },
                });
            });
        }

        return ctx.res(ERROR_RESPONSE);
    }
);
