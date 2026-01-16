import { ApplicationCommandType, ApplicationIntegrationType, Locale } from 'discord-api-types/v10';
import { Command, CommandContext, Option } from 'discord-hono';

import { searchHandler } from '../cmd_handler';
import { ERROR_RESPONSE } from '../consts';
import { factory } from '../init';
import type { CommandSet } from '../types';

export const searchCommand: CommandSet = factory.command(
    new Command('search', 'Search')
        .description_localizations({ [Locale.Japanese]: '検索します' })
        .type(ApplicationCommandType.ChatInput)
        .integration_types(
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall
        )
        .options(
            new Option('query', 'Please enter a title or URL', 'String')
                .name_localizations({ [Locale.Japanese]: 'クエリ' })
                .description_localizations({
                    [Locale.Japanese]: 'タイトルまたはURLを入力してください',
                })
                .required(true),
            /*Object.values(Locale).reduce((data, key) => {
                    if (Locale.Japanese === key) {
                        data[key] = 'タイトルまたはURLを入力してください';
                    } else {
                        data[key] = 'Please enter a title or URL';
                    }
                    return data;
                }, {} as Record<Locale, string>),*/
            new Option(
                'focus_on_illegal',
                'Rewrite the query to focus on illegal content',
                'Integer'
            )
                .description_localizations({
                    [Locale.Japanese]: '違法コンテンツに焦点を当てるクエリに書き換えます',
                })
                .choices(
                    { name: 'Off', name_localizations: { [Locale.Japanese]: 'オフ' }, value: 0 },
                    { name: 'Weak', name_localizations: { [Locale.Japanese]: '弱' }, value: 1 },
                    {
                        name: 'Strong:Default',
                        name_localizations: { [Locale.Japanese]: '強:初期値' },
                        value: 2,
                    }
                )
                .min_value(0)
                .max_value(2)
                .required(false),
            new Option('to_magazine', 'Find the magazine in which this work appears', 'Boolean')
                .description_localizations({
                    [Locale.Japanese]: 'この作品が掲載されている雑誌を探します',
                })
                .required(false)
        ),
    async (ctx: CommandContext): Promise<Response> => {
        if (ctx.var['query']) {
            console.log(ctx.var);
            const rewriteLevel: 0 | 1 | 2 = ctx.var['focus_on_illegal'];
            const toMagazine: boolean = ctx.var['to_magazine'];
            const originalQuery: string = ctx.var['query'];

            return ctx.resDefer(
                (ctx: CommandContext): Promise<void> =>
                    searchHandler(ctx, [originalQuery], rewriteLevel, toMagazine)
            );
        }

        return ctx.res(ERROR_RESPONSE);
    }
);
