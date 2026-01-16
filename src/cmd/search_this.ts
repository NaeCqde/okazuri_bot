import {
    APIMessageApplicationCommandInteractionData,
    ApplicationCommandType,
    ApplicationIntegrationType,
    Locale,
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
        const urls: string[] = getUrls(source.resolved.messages[source.target_id].content);

        if (urls.length) {
            return ctx.resDefer(async (ctx: CommandContext): Promise<void> => {
                const queries: string[] = await Promise.all(urls.map((url) => titleByUrl(url)));

                return searchHandler(ctx, queries, 0, false, 'search_this');
            });
        }

        return ctx.flags('EPHEMERAL', 'SUPPRESS_EMBEDS').res({
            content: '# 検索結果\n## 無し',
        });
    }
);
