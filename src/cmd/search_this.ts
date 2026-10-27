import { ApplicationIntegrationType, Locale, PermissionFlagsBits } from 'discord-api-types/v10';
import { makeMessageCommand } from 'discord-hono';

import { searchHandler, titlesFromUrls } from '../cmd_handler';
import { getUrls } from '../formatter';
import { factory } from '../init';

export const searchThisCommand = factory.command(
    makeMessageCommand('Search this')
        .name_localizations({ [Locale.Japanese]: 'これらを検索' })
        .default_member_permissions(PermissionFlagsBits.ViewChannel.toString())
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ]),
    (c) => {
        const urls: string[] = getUrls(c.ref.messages?.[c.ref.target_id]?.content ?? '');

        if (urls.length) {
            return c.resDefer(async (c) => {
                const queries: string[] = await titlesFromUrls(urls);

                if (!queries.length) {
                    await c.flags('SUPPRESS_EMBEDS').followup({
                        content: '# 検索結果\n## なし',
                    });

                    return;
                }

                return searchHandler(c, queries, 0, false, 'search_this');
            });
        }

        return c.flags('EPHEMERAL', 'SUPPRESS_EMBEDS').res({
            content: '# 検索結果\n## なし',
        });
    }
);
