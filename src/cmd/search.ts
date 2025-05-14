import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ApplicationIntegrationType,
    Locale,
} from 'discord-api-types/v10';
import { Command, CommandContext, type DiscordHono } from 'discord-hono';
import { ERROR_MESSAGE, ERROR_RESPONSE } from '../consts.js';
import { createErrorLog, resultToText, splitText } from '../formatter.js';
import { toNumber } from '../magazines.js';
import { rewrite } from '../rewriter.js';
import { searchMultiple } from '../search.js';

export const searchCommand = {
    command: new Command('search', 'Search')
        .description_localizations({ [Locale.Japanese]: '検索します' })
        .type(ApplicationCommandType.ChatInput)
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .options([
            {
                name: 'query',
                type: ApplicationCommandOptionType.String,
                name_localizations: { [Locale.Japanese]: 'クエリ' },
                description: 'Please enter a title or URL',
                description_localizations: {
                    [Locale.Japanese]: 'タイトルまたはURLを入力してください',
                },
                /*Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = 'タイトルまたはURLを入力してください';
                    } else {
                        data[key] = 'Please enter a title or URL';
                    }
                    return data;
                }, {} as Record<Locale, string>),*/

                required: true,
            },
            {
                name: 'to_magazine',
                type: ApplicationCommandOptionType.Boolean,
                description: 'Find the magazine in which this work appears',
                description_localizations: {
                    [Locale.Japanese]: 'この作品が掲載されている雑誌を探します',
                },
                required: false,
            },
        ]),
    async register(bot: DiscordHono) {
        bot.command('search', this.handler);
    },
    async handler(ctx: CommandContext): Promise<Response> {
        const source: APIChatInputApplicationCommandInteraction = ctx.interaction.structure as any;
        const options:
            | [
                  APIApplicationCommandInteractionDataStringOption,
                  APIApplicationCommandInteractionDataNumberOption,
                  APIApplicationCommandInteractionDataBooleanOption
              ]
            | [
                  APIApplicationCommandInteractionDataStringOption,
                  APIApplicationCommandInteractionDataNumberOption
              ]
            | [
                  APIApplicationCommandInteractionDataStringOption,
                  APIApplicationCommandInteractionDataBooleanOption
              ]
            | [APIApplicationCommandInteractionDataStringOption]
            | [APIApplicationCommandInteractionDataStringOption]
            | undefined = source.data.options as any;

        if (options && options.length && options[0].value.length) {
            const tempRewriteLevel = options.filter((o) => o.name === 'focus_on_illegal');
            const tempToMagazine = options.filter((o) => o.name === 'to_magazine');

            const originalQuery: string = options[0].value;
            const rewriteLevel: 0 | 1 | 2 =
                options.length >= 2 && tempRewriteLevel.length
                    ? (tempRewriteLevel[0].value as 1 | 2)
                    : 0;
            const toMagazine: boolean =
                options.length >= 2 && tempToMagazine.length
                    ? (tempToMagazine[0].value as boolean)
                    : false;

            ctx.defer(async (ctx: Context): Promise<void> => {
                let query: string = originalQuery;

                if (rewriteLevel && !toMagazine) {
                    query = await rewrite(query, rewriteLevel);
                }

                let result: SearchResultMap;

                try {
                    if (toMagazine) query = (await toNumber(originalQuery)).name;
                    if (rewriteLevel && toMagazine) {
                        query = await rewrite(query, rewriteLevel);
                    }

                    result = await searchMultiple([query]);
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
                            content: createErrorLog(
                                [originalQuery],
                                'search',
                                toMagazine,
                                e as Error
                            ),
                        }),
                    });

                    return;
                }

                const contents = splitText(
                    resultToText(result, rewriteLevel ? [originalQuery] : undefined)
                );

                for (const content of contents) {
                    await ctx.followup.reply({
                        content,
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
