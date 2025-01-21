// レーベル名 and No.**を入力して作品一覧を表示する
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
import { Work } from '../../db/schema.js';
import { createErrorLog, splitText } from '../../formatter.js';
import { listWorks } from '../../magazines.js';

export const worksCommand: Command = {
    command: {
        name: 'works',
        description: 'Show a list of works published in the magazine',
        description_localizations: Object.values(Locale).reduce((data, key) => {
            if (Locale.Japanese === key) {
                data[key] = '雑誌に掲載されている作品一覧を表示します';
            } else {
                data[key] = 'Show a list of works published in the magazine';
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
                name: 'magazine',
                description: 'Please enter the magazine',
                description_localizations: Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = '雑誌を入力してください';
                    } else {
                        data[key] = 'Please enter the magazine';
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
                const magazine: string = options[0].value;
                let works: Work[];

                try {
                    works = await listWorks(magazine);
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
                            content: createErrorLog([magazine], 'works', false, e as Error),
                        }),
                    });

                    return;
                }

                const content: string[] = [];

                for (const work of works) {
                    content.push(
                        `[${work.name}](https://www.dlsite.com/books/work/=/product_id/${work.id}.html)`
                    );
                }

                for (const c of splitText(content)) {
                    await ctx.followup.reply({
                        content: c,
                        flags: MessageFlags.SuppressEmbeds,
                        allowed_mentions: {
                            parse: [],
                        },
                    });
                }
            });

            return {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: {},
            };
        }

        return ERROR_RESPONSE;
    },
};
