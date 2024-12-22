import {
    APIInteractionResponse,
    APIMessage,
    APIMessageApplicationCommandInteraction,
    ApplicationCommandType,
    ApplicationIntegrationType,
    Command,
    Context,
    InteractionResponseType,
    Locale,
    MessageFlags,
    Permissions,
} from "@discordcf/framework";

import { ERROR_MESSAGE } from "../consts.js";
import { createErrorLog, getUrls, resultToText, splitText } from "../formatter.js";
import { searchMultiple } from "../search.js";

export const searchThisCommand: Command = {
    command: {
        name: "Search this",
        name_localizations: Object.values(Locale).reduce((data, key) => {
            if (key === Locale.Japanese) {
                data[key] = "それらを検索";
            } else {
                data[key] = "Search this";
            }

            return data;
        }, {} as Record<Locale, string>),
        default_member_permissions: new Permissions(["ViewChannel"]).compute(),
        type: ApplicationCommandType.Message,
        nsfw: false,
        integration_types: [
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ],
    },
    handler: async (ctx: Context): Promise<APIInteractionResponse> => {
        const source: APIMessageApplicationCommandInteraction = ctx.interaction
            .structure as APIMessageApplicationCommandInteraction;
        const messages = Object.values(source.data.resolved.messages);

        if (messages.length) {
            const msg: APIMessage = messages[0];

            const urls: string[] = getUrls(msg.content);

            if (urls.length) {
                ctx.defer(async (ctx: Context): Promise<void> => {
                    let result: SearchResultMap;

                    try {
                        result = await searchMultiple(urls);
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
                                content: createErrorLog(urls, "search_this", false, e as Error),
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
        }

        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
                flags: MessageFlags.SuppressEmbeds | MessageFlags.Ephemeral,
                content: "# 検索結果\n## 無し",
            },
        };
    },
};
