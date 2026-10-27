// メッセージ内のURLを、設定(クエリ書き換えレベル・雑誌を探す)を選んでから検索する。
// 設定はメッセージの本文に持ち、ボタン・セレクトを操作するたびに本文とコンポーネントを更新する。
import { ApplicationIntegrationType, Locale, PermissionFlagsBits } from 'discord-api-types/v10';
import {
    buttonStyle,
    makeActionRow,
    makeButton,
    makeMessageCommand,
    makeStringSelect,
    makeStringSelectOption,
} from 'discord-hono';

import { searchHandler, titlesFromUrls } from '../cmd_handler';
import { getUrls } from '../formatter';
import { factory } from '../init';
import { reply } from '../reply';

type RewriteLevel = 0 | 1 | 2;

const LEVEL_LABELS = ['オフ', '弱', '強'] as const;

// 本文(2000文字)に収める
const MAX_URLS = 10;

const URLS_PATTERN = /^\|\|\[urls\]\((.*)\)\|\|$/;
const LEVEL_PREFIX = 'クエリ書き換えレベル：';
const MAGAZINE_PREFIX = '雑誌を探す：';

const TO_MAGAZINE_BUTTON = makeButton('to-magazine', ['📖', 'Magazine'], buttonStyle.Danger);
const REWRITE_LEVEL_SELECT = makeStringSelect('rewrite-level', [
    ['0', 'Off:Default'],
    ['1', 'Weak'],
    ['2', 'Strong'],
]).placeholder('Rewrite Level');
const SEARCH_BUTTON = makeButton('search', ['🔍', 'Search'], buttonStyle.Success);

function buildComponents(level: RewriteLevel, toMagazine: boolean) {
    return [
        makeActionRow([
            // 選ばれているレベルを default にして、選び直したあとも表示が変わらないようにする
            REWRITE_LEVEL_SELECT.options([
                makeStringSelectOption('0', 'Off:Default').default(level === 0),
                makeStringSelectOption('1', 'Weak').default(level === 1),
                makeStringSelectOption('2', 'Strong').default(level === 2),
            ]),
        ]),
        makeActionRow([
            TO_MAGAZINE_BUTTON.style(toMagazine ? buttonStyle.Primary : buttonStyle.Secondary),
        ]),
        makeActionRow([SEARCH_BUTTON]),
    ];
}

function formatState(urls: string[], level: RewriteLevel = 0, toMagazine: boolean = false): string {
    return `||[urls](${urls.join('|')})||

${LEVEL_PREFIX}${LEVEL_LABELS[level]}
${MAGAZINE_PREFIX}${toMagazine ? 'はい' : 'いいえ'}`;
}

function parseState(content: string) {
    const lines = content.split('\n');

    const urls: string[] = lines[0]?.match(URLS_PATTERN)?.[1].split('|') ?? [];

    const label = lines.find((l) => l.startsWith(LEVEL_PREFIX))?.slice(LEVEL_PREFIX.length).trim();
    const level = Math.max(0, LEVEL_LABELS.indexOf(label as (typeof LEVEL_LABELS)[number])) as RewriteLevel;

    const toMagazine: boolean =
        lines.find((l) => l.startsWith(MAGAZINE_PREFIX))?.includes('はい') ?? false;

    return { urls, level, toMagazine };
}

export const toMagazineComponent = factory.component(TO_MAGAZINE_BUTTON, (c) => {
    const state = parseState(c.interaction.message.content);
    const toMagazine = !state.toMagazine;

    return c.update().res({
        content: formatState(state.urls, state.level, toMagazine),
        components: buildComponents(state.level, toMagazine),
    });
});

export const rewriteLevelComponent = factory.component(REWRITE_LEVEL_SELECT, (c) => {
    const state = parseState(c.interaction.message.content);

    const selected = Number(c.ref.values?.[0] ?? 0);
    const level = (selected === 1 || selected === 2 ? selected : 0) as RewriteLevel;

    return c.update().res({
        content: formatState(state.urls, level, state.toMagazine),
        components: buildComponents(level, state.toMagazine),
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
            content: formatState(state.urls, state.level, state.toMagazine),
            components: [],
        });

        const queries: string[] = await titlesFromUrls(state.urls);

        if (!queries.length) {
            await reply(c, ['# 検索結果\n## なし'], false);

            return;
        }

        // 結果は新しいメッセージで送る(確定した設定のメッセージを残す)
        await searchHandler(c, queries, state.level, state.toMagazine, 'search_this_option', false);
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
                components: buildComponents(0, false),
            });
        }

        return c.flags('EPHEMERAL', 'SUPPRESS_EMBEDS').res('# 検索結果\n## なし');
    }
);
