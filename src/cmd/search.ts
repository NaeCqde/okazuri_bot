import { ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import {
    makeBooleanOption,
    makeIntegerOption,
    makeSlashCommand,
    makeStringOption,
} from 'discord-hono';

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
            makeIntegerOption(
                'focus_on_illegal',
                'Rewrite the query to focus on illegal content'
            )
                .description_localizations({
                    [Locale.Japanese]: '違法コンテンツに焦点を当てるクエリに書き換えます',
                })
                .choices([
                    { name: 'Off', name_localizations: { [Locale.Japanese]: 'オフ' }, value: 0 },
                    { name: 'Weak', name_localizations: { [Locale.Japanese]: '弱' }, value: 1 },
                    {
                        name: 'Strong:Default',
                        name_localizations: { [Locale.Japanese]: '強:初期値' },
                        value: 2,
                    },
                ])
                .min_value(0)
                .max_value(2)
                .required(false),
            makeBooleanOption('to_magazine', 'Find the magazine in which this work appears')
                .description_localizations({
                    [Locale.Japanese]: 'この作品が掲載されている雑誌を探します',
                })
                .required(false),
        ]),
    (c) => {
        const { query, focus_on_illegal, to_magazine } = c.var;

        if (!query) return c.res(ERROR_RESPONSE);

        // 省略したときは、選択肢の表示(強:初期値)のとおり強
        const rewriteLevel = (focus_on_illegal ?? 2) as 0 | 1 | 2;

        return c.resDefer((c) => searchHandler(c, [query], rewriteLevel, to_magazine ?? false));
    }
);
