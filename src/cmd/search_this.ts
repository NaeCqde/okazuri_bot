import {
    APIMessage,
    APIMessageApplicationCommandInteractionData,
    ApplicationCommandType,
    ApplicationIntegrationType,
    Locale,
    MessageFlags,
    PermissionFlagsBits,
} from 'discord-api-types/v10';
import { Command, CommandContext } from 'discord-hono';

import { searchHandler } from '../cmd_handler';
import { getUrls } from '../formatter';
import { factory } from '../init';
import { titleByUrl } from '../search/search';
import type { CommandSet } from '../types';

export const searchThisCommand: CommandSet = factory.command(
    new Command('Search this')
        .name_localizations({ [Locale.Japanese]: 'これらを検索' })
        .default_member_permissions(PermissionFlagsBits.ViewChannel.toString())
        .type(ApplicationCommandType.Message)
        .integration_types(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        ),
    async (ctx: CommandContext): Promise<Response> => {
        const source: APIMessageApplicationCommandInteractionData = ctx.interaction.data as any;
        const messages = Object.values(source.resolved.messages);

        if (messages.length) {
            const msg: APIMessage = messages[0];
            const urls: string[] = getUrls(msg.content);

            if (urls.length) {
                return ctx.resDefer(async (ctx: CommandContext): Promise<void> => {
                    const queries: string[] = [];
                    for (const url of urls) {
                        queries.push(await titleByUrl(url));
                    }

                    return searchHandler(ctx, queries, 0, false, 'search_this');
                });
            }
        }

        return ctx.res({
            flags: MessageFlags.SuppressEmbeds | MessageFlags.Ephemeral,
            content: '# 検索結果\n## 無し',
        });
    }
);
