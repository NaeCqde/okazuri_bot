// メッセージ内のURLを、設定(雑誌を探す)を選んでから検索する。
// 設定はメッセージの本文に持ち、ボタンを操作するたびに本文とコンポーネントを更新する。
import { ApplicationIntegrationType, Locale, PermissionFlagsBits } from 'discord-api-types/v10';
import { buttonStyle, makeActionRow, makeButton, makeMessageCommand } from 'discord-hono';

import { searchHandler, titlesFromUrls } from '../cmd_handler';
import { getUrls } from '../formatter';
import { factory } from '../init';
import { reply } from '../reply';

// 本文(2000文字)に収める
const MAX_URLS = 10;

const URLS_PATTERN = /^\|\|\[urls\]\((.*)\)\|\|$/;
const MAGAZINE_PREFIX = '雑誌を探す：';

const TO_MAGAZINE_BUTTON = makeButton('to-magazine', ['📖', 'Magazine'], buttonStyle.Danger);
const SEARCH_BUTTON = makeButton('search', ['🔍', 'Search'], buttonStyle.Success);

function buildComponents(toMagazine: boolean) {
    return [
        makeActionRow([
            TO_MAGAZINE_BUTTON.style(toMagazine ? buttonStyle.Primary : buttonStyle.Secondary),
        ]),
        makeActionRow([SEARCH_BUTTON]),
    ];
}

function formatState(urls: string[], toMagazine: boolean = false): string {
    return `||[urls](${urls.join('|')})||

${MAGAZINE_PREFIX}${toMagazine ? 'はい' : 'いいえ'}`;
}

function parseState(content: string) {
    const lines = content.split('\n');

    const urls: string[] = lines[0]?.match(URLS_PATTERN)?.[1].split('|') ?? [];

    const toMagazine: boolean =
        lines.find((l) => l.startsWith(MAGAZINE_PREFIX))?.includes('はい') ?? false;

    return { urls, toMagazine };
}

export const toMagazineComponent = factory.component(TO_MAGAZINE_BUTTON, (c) => {
    const state = parseState(c.interaction.message.content);
    const toMagazine = !state.toMagazine;

    return c.update().res({
        content: formatState(state.urls, toMagazine),
        components: buildComponents(toMagazine),
    });
});

export const searchComponent = factory.component(SEARCH_BUTTON, (c) => {
    const state = parseState(c.interaction.message.content);

    if (!state.urls.length) {
        return c.update().res({
            content: '設定を読み取れませんでした。もう一度、コマンドを実行してください。',
            components: [],
        });
    }

    return c.update().resDefer(async (c) => {
        // 最初の followup は元のメッセージを編集する(設定を確定して、操作できなくする)
        await c.followup({
            content: formatState(state.urls, state.toMagazine),
            components: [],
        });

        const queries: string[] = await titlesFromUrls(state.urls);

        if (!queries.length) {
            await reply(c, ['# 検索結果\n## なし'], false);

            return;
        }

        // 結果は新しいメッセージで送る(確定した設定のメッセージを残す)
        await searchHandler(c, queries, state.toMagazine, 'search_this_option', false);
    });
});

export const searchThisOptionCommand = factory.command(
    makeMessageCommand('Search this with option')
        .name_localizations({ [Locale.Japanese]: 'これらを設定付きで検索' })
        .default_member_permissions(PermissionFlagsBits.ViewChannel.toString())
        .integration_types([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ]),
    (c) => {
        const message = c.ref.messages?.[c.ref.target_id];
        const urls: string[] = getUrls(message?.content ?? '').slice(0, MAX_URLS);

        if (urls.length) {
            return c.res({
                content: formatState(urls),
                components: buildComponents(false),
            });
        }

        return c.flags('EPHEMERAL', 'SUPPRESS_EMBEDS').res('# 検索結果\n## なし');
    }
);
