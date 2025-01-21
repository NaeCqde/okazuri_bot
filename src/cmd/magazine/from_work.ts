// 作品名からレーベル名 and No.を表示する
import {
    APIApplicationCommandInteractionDataStringOption,
    APIChatInputApplicationCommandInteraction,
    APIInteractionResponse,
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ApplicationIntegrationType,
    Command,
    Context,
    InteractionResponseType,
    Locale,
    MessageFlags,
} from '@discordcf/framework';

import { ERROR_MESSAGE, ERROR_RESPONSE } from '../../consts.js';
import type { Number } from '../../db/schema.js';
import { createErrorLog } from '../../formatter.js';
import { toNumber } from '../../magazines.js';

export const fromWorkCommand: Command = {
    command: {
        name: 'from_work',
        description: 'Search for magazine by title',
        description_localizations: Object.values(Locale).reduce((data, key) => {
            if (Locale.Japanese === key) {
                data[key] = 'タイトルから雑誌を検索します';
            } else {
                data[key] = 'Search for magazine by title';
            }

            return data;
        }, {} as Record<Locale, string>),
        type: ApplicationCommandType.ChatInput,
        nsfw: false,
        integration_types: [
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ],
        options: [
            {
                name: 'title',
                description: 'Please enter a title',
                description_localizations: Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = 'タイトルを入力してください';
                    } else {
                        data[key] = 'Please enter a title';
                    }
                    return data;
                }, {} as Record<Locale, string>),
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    handler: async (ctx: Context): Promise<APIInteractionResponse> => {
        const source: APIChatInputApplicationCommandInteraction = ctx.interaction.structure as any;
        const options: [APIApplicationCommandInteractionDataStringOption] | undefined = source.data
            .options as any;

        if (options && options.length && options[0].value.length) {
            ctx.defer(async (ctx: Context): Promise<void> => {
                const title: string = options[0].value;
                let number: Number;

                try {
                    number = await toNumber(title);
                } catch (e: any) {
                    await ctx.followup.reply({
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

                await ctx.followup.reply({
                    content: number.name,
                    flags: MessageFlags.SuppressEmbeds,
                    allowed_mentions: {
                        parse: [],
                    },
                });
            });

            return {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: {},
            };
        }

        return ERROR_RESPONSE;
    },
};
