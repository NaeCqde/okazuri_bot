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
} from "@discordcf/framework";

import { ERROR_MESSAGE, ERROR_RESPONSE } from "../consts.js";
import { createErrorLog, resultToText, splitText } from "../formatter.js";
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
        const source: APIChatInputApplicationCommandInteraction = ctx.interaction
            .structure as APIChatInputApplicationCommandInteraction;
        const options: APIApplicationCommandInteractionDataStringOption[] | undefined = source.data
            .options as APIApplicationCommandInteractionDataStringOption[] | undefined;

        if (options && options.length && options[0].value.length) {
            ctx.defer(async (ctx: Context): Promise<void> => {
                let result: SearchResultMap;

                try {
                    result = await searchMultiple([options[0].value]);
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
                            content: createErrorLog(source, e as Error, "search"),
                        }),
                    });

                    return;
                }

                const contents = splitText(resultToText(result));

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
