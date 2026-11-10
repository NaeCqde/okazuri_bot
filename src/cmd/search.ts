import { ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { makeBooleanOption, makeSlashCommand, makeStringOption } from 'discord-hono';

import { searchHandler } from '../cmd_handler';
import { ERROR_RESPONSE } from '../consts';
import { factory } from '../init';

export const searchCommand = factory.command(
    makeSlashCommand('search', 'Search')
        .description_localizations({ [Locale.Japanese]: '検索します' })
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .options([
            makeStringOption('query', 'Please enter a title or URL')
                .name_localizations({ [Locale.Japanese]: 'クエリ' })
                .description_localizations({
                    [Locale.Japanese]: 'タイトルまたはURLを入力してください',
                })
                .required(true),
            makeBooleanOption('to_magazine', 'Find the magazine in which this work appears')
                .description_localizations({
                    [Locale.Japanese]: 'この作品が掲載されている雑誌を探します',
                })
                .required(false),
        ]),
    (c) => {
        const { query, to_magazine } = c.var;

        if (!query) return c.res(ERROR_RESPONSE);

        return c.resDefer((c) => searchHandler(c, [query], to_magazine ?? false));
    }
);
