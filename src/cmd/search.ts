import {
    APIApplicationCommandInteractionDataBooleanOption,
    APIApplicationCommandInteractionDataNumberOption,
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
} from "@discordcf/framework";

import { ERROR_MESSAGE, ERROR_RESPONSE } from "../consts.js";
import { createErrorLog, resultToText, splitText } from "../formatter.js";
import { toNumber } from "../magazines.js";
import { rewrite } from "../rewriter.js";
import { searchMultiple } from "../search.js";

export const searchCommand: Command = {
    command: {
        name: "search",
        description: "Search",
        description_localizations: Object.values(Locale).reduce((data, key) => {
            if (Locale.Japanese === key) {
                data[key] = "検索します";
            } else {
                data[key] = "Search";
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
                name: "query",
                description: "Please enter a title or URL",
                description_localizations: Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = "タイトルまたはURLを入力してください";
                    } else {
                        data[key] = "Please enter a title or URL";
                    }
                    return data;
                }, {} as Record<Locale, string>),
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "focus_on_illegal",
                description:
                    "Rewrite the search query to make it more likely that illegal uploads will come up. The numbers are rewrite levels",
                description_localizations: Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] =
                            "違法アップロードが出やすくなる検索ワードに書き換えます。数字は書き換えレベルです";
                    } else {
                        data[key] =
                            "Rewrite the search query to make it more likely that illegal uploads will come up. The numbers are rewrite levels";
                    }
                    return data;
                }, {} as Record<Locale, string>),
                type: ApplicationCommandOptionType.Number,
                min_value: 1,
                max_value: 2,
                required: false,
            },
            {
                name: "to_magazine",
                description: "Find the magazine in which this work appears",
                description_localizations: Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = "この作品が掲載されている雑誌を探します";
                    } else {
                        data[key] = "Find the magazine in which this work appears";
                    }
                    return data;
                }, {} as Record<Locale, string>),
                type: ApplicationCommandOptionType.Boolean,
                required: false,
            },
        ],
    },
    handler: async (ctx: Context): Promise<APIInteractionResponse> => {
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
            | undefined = source.data.options as any;

        if (options && options.length && options[0].value.length) {
            const tempRewriteLevel = options.filter((o) => o.name === "focus_on_illegal");
            const tempToMagazine = options.filter((o) => o.name === "to_magazine");

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
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            content: createErrorLog(
                                [originalQuery],
                                "search",
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
