import {
    APIMessage,
    APIMessageApplicationCommandInteractionData,
    ApplicationCommandType,
    ApplicationIntegrationType,
    ButtonStyle,
    Locale,
    PermissionFlagsBits,
} from 'discord-api-types/v10';
import { Button, Command, CommandContext, Components, Select } from 'discord-hono';

import { searchHandler } from '../cmd_handler';
import { getUrls } from '../formatter';
import { factory } from '../init';
import { titleByUrl } from '../search/search';
import type { CommandSet } from '../types';

const components = new Components()
    .row(
        new Select('rewrite-level', 'String')
            .options(
                {
                    label: 'Off:Default',
                    value: '0',
                    default: true,
                },
                {
                    label: 'Weak',
                    value: '1',
                },
                {
                    label: 'Strong',
                    value: '2',
                }
            )
            .placeholder('Rewrite Level')
    )
    .row(new Button('to-magazine', ['📖', 'Magazine'], 'Danger'))
    .row(new Button('search', ['🔍', 'Search'], 'Success'));

export const toMagazineComponent = factory.component(
    new Button('to-magazine', ['📖', 'Magazine'], 'Danger'),
    (c) => {
        const json = components.toJSON();
        console.log(c.var);
        console.log(json);

        const state = parseState(c.interaction.message.content);
        if (state.toMagazine) {
            json[1].components[0].style = ButtonStyle.Primary;
        }

        return c.update().resDefer((c) =>
            c.followup({
                content: formatState(state.urls, state.rewriteLevel, state.toMagazine),
                components: json,
            })
        );
    }
);

export const rewriteLevelComponent = factory.component(
    new Select('rewrite-level', 'String')
        .options(
            {
                label: 'Off:Default',
                value: '0',
                default: true,
            },
            {
                label: 'Weak',
                value: '1',
            },
            {
                label: 'Strong',
                value: '2',
            }
        )
        .placeholder('Rewrite Level'),
    (c) => {
        const json = components.toJSON();
        console.log(c.var);
        console.log(json);

        const state = parseState(c.interaction.message.content);
        if (state.toMagazine) {
            json[1].components[1].style = ButtonStyle.Primary;
        }

        return c.update().res({
            content: formatState(state.urls, c.var['rewrite-level'], state.toMagazine),
            components: json,
        });
    }
);

export const searchComponent = factory.component(
    new Button('search', ['🔍', 'Search'], 'Success'),
    async (c) => {
        const state = parseState(c.interaction.message.content);
        await c.update().followup({
            content: formatState(state.urls, state.rewriteLevel, state.toMagazine),
            components: [],
        });

        return c.resDefer(async (c) => {
            const queries: string[] = [];
            for (const url of state.urls) {
                queries.push(await titleByUrl(url));
            }

            return await searchHandler(
                c,
                queries,
                state.rewriteLevel,
                state.toMagazine,
                'search_this_option'
            );
        });
    }
);

export const searchThisOptionCommand: CommandSet = factory.command(
    new Command('Search this with option')
        .name_localizations({ [Locale.Japanese]: 'これらを設定付きで検索' })
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
                return ctx.res({
                    content: formatState(urls),
                    components,
                });
            }
        }

        return ctx.flags('EPHEMERAL', 'SUPPRESS_EMBEDS').res('# 検索結果\n## 無し');
    }
);

function parseState(content: string) {
    const lines = content.split('\n');
    const urls: string[] = lines[0].split('(')[1].slice(0, -3).split('|');

    let rewriteLevel: 0 | 1 | 2 = 0;
    switch (true) {
        case urls.includes('弱'):
            rewriteLevel = 1;
            break;
        case urls.includes('強'):
            rewriteLevel = 2;
            break;
    }

    const toMagazine: boolean = lines[3].includes('はい');
    return { urls, rewriteLevel, toMagazine };
}

function formatState(
    urls: string[],
    newRewriteLevel: 0 | 1 | 2 = 0,
    newToMagazine: boolean = false
): string {
    let rewriteLevel: string = 'オフ';
    switch (newRewriteLevel) {
        case 1:
            rewriteLevel = '弱';
            break;
        case 2:
            rewriteLevel = '強';
            break;
    }

    const toMagazine: string = newToMagazine ? 'はい' : 'いいえ';
    return `||[urls](${urls.join('|')})||

クエリ書き換えレベル：${rewriteLevel}
違法コンテンツを出しやすくする：${toMagazine}`;
}
