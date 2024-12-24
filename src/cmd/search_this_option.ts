// TODO
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
import { searchMultiple, titleByUrl } from "../search.js";

export const searchThisOptionCommand: Command = {
    command: {
        name: "Search this with option",
        name_localizations: Object.values(Locale).reduce((data, key) => {
            if (key === Locale.Japanese) {
                data[key] = "これらを設定付きで検索";
            } else {
                data[key] = "Search this with option";
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
                    const queries: string[] = [];
                    let result: SearchResultMap;

                    try {
                        for (const url of urls) {
                            queries.push(await titleByUrl(url));
                        }

                        result = await searchMultiple(queries);
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
