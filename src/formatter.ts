import { URL_PATTERN } from './consts';
import type { SearchResultMap } from './types';

// 号・作品の日付は、日本の日付を UTC の0時で保存している
export function formatDate(date: Date): string {
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');

    return `${date.getUTCFullYear()}/${mm}/${dd}`;
}

export function getUrls(content: string): string[] {
    return Array.from(content.matchAll(URL_PATTERN)).map((el) => el[0]);
}

const MAX_TITLE_LENGTH = 100;

// 制御文字、ゼロ幅文字、双方向制御文字(表示を乱す)
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g;

/**
 * Discord のリンクの文字([タイトル])に入れるために、タイトルを整える。
 * 改行や見えない文字は空白にし、長すぎるものは切り、記号は \ で打ち消す。
 * Discord は英数字と空白以外の文字の前の \ を、その文字そのものとして表示する。
 */
export function escapeTitle(title: string): string {
    const chars = Array.from(title.replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim());
    const clipped = chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH - 1).join('') + '…' : chars.join('');

    return clipped.replace(/[\\*_~|`\[\]()<>#@:!\-]/g, '\\$&');
}

/** リンク先の URL を (<…>) に入れても壊れないようにする。 */
export function escapeUrl(url: string): string {
    return url.replace(/[\s()<>]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

const FLAGS: Record<string, string> = {
    EN: '🇺🇸', ENG: '🇺🇸', JP: '🇯🇵', JA: '🇯🇵', JPN: '🇯🇵', CN: '🇨🇳', ZH: '🇨🇳', TW: '🇹🇼',
    KR: '🇰🇷', KO: '🇰🇷', ES: '🇪🇸', SPA: '🇪🇸', FR: '🇫🇷', DE: '🇩🇪', RU: '🇷🇺', IT: '🇮🇹',
    TH: '🇹🇭', PT: '🇵🇹', ID: '🇮🇩', PL: '🇵🇱', TR: '🇹🇷', VN: '🇻🇳', VI: '🇻🇳',
    JAP: '🇯🇵', RUS: '🇷🇺', VIE: '🇻🇳',
    // 言語名: [English] [Korean] ...
    ENGLISH: '🇺🇸', JAPANESE: '🇯🇵', CHINESE: '🇨🇳', KOREAN: '🇰🇷', SPANISH: '🇪🇸', FRENCH: '🇫🇷',
    GERMAN: '🇩🇪', RUSSIAN: '🇷🇺', ITALIAN: '🇮🇹', THAI: '🇹🇭', PORTUGUESE: '🇵🇹', INDONESIAN: '🇮🇩',
    POLISH: '🇵🇱', TURKISH: '🇹🇷', VIETNAMESE: '🇻🇳', ARABIC: '🇸🇦',
};

// 言語コードと並んでよい語(これ以外の語が混じる括弧は、言語の括弧とみなさない: [It Girl] など)
const CODE_FILLER = new Set(['SUB', 'SUBS']);

// 中国語の印(これを含むタイトルは 🇨🇳)。訳者名のような括弧は、国旗だけ付けて括弧は残す
const CHINESE = /中国翻訳|中文|汉化|漢化|简体|簡體|繁體|繁体|嵌字/;
// 括弧ごと消す、中国語の言語表記(括弧の中身がこれだけのもの)
const CHINESE_LABEL = /^(中国翻訳|中国語|中文|简体中文|簡體中文|繁體中文|繁体中文|汉化|漢化)$/;
// 先頭の国旗(サイトが付けているもの)
const LEADING_FLAGS = /^(?:\p{Regional_Indicator}{2}\s*)+/u;
// [EN] [JP] [English] [CN,EN,JP,KR] [jap / eng] [中国翻訳] のような、言語だけの括弧(全角の空白も含めて消す)
const BRACKET_GROUP = /\s*[\[(【]([^\[\]()【】]{1,40})[\])】]/g;

/**
 * タイトルを、国旗(言語)と、言語の表記を除いたタイトルに分ける。
 * - 先頭にサイトが付けた国旗があれば、取り出す(あとでリンクの先頭に付け直す)
 * - [English] [EN] [中国翻訳] のような言語だけの括弧は、消して国旗にする
 * - 訳者名の括弧([山嵐个人汉化] など)は残す。中国語の印があれば国旗だけ付ける
 */
export function parseTitle(title: string): { flags: string; text: string } {
    const flags = new Set<string>();
    let text = title.trim();

    const leading = LEADING_FLAGS.exec(text);
    if (leading) {
        for (const f of leading[0].match(/\p{Regional_Indicator}{2}/gu) ?? []) flags.add(f);
        text = text.slice(leading[0].length);
    }

    if (CHINESE.test(text)) flags.add('🇨🇳');

    text = text.replace(BRACKET_GROUP, (whole, inner: string) => {
        const body = inner.trim();

        if (CHINESE_LABEL.test(body)) {
            flags.add('🇨🇳');
            return '';
        }

        const codes = body.toUpperCase().split(/[\s,/&+-]+/).filter(Boolean);
        if (!codes.length || !codes.every((c) => c in FLAGS || CODE_FILLER.has(c))) return whole;

        for (const code of codes) {
            if (code in FLAGS) flags.add(FLAGS[code]);
        }
        return '';
    });

    return { flags: [...flags].join(''), text: text.replace(/\s+/g, ' ').trim() };
}

/** タイトルの言語の国旗(絵文字)を返す。なければ空文字。 */
export function languageFlags(title: string): string {
    return parseTitle(title).flags;
}

/** `1. [🇨🇳 タイトル](<url>)` の形の、リンクの文字。タイトルがなければ URL だけ。 */
export function resultLink(r: { title: string; url: string }): string {
    const { flags, text } = parseTitle((r.title ?? '').replace(INVISIBLE, ' '));
    const escaped = escapeTitle(text);
    if (!escaped) return r.url;

    return `[${flags ? flags + ' ' : ''}${escaped}](<${escapeUrl(r.url)}>)`;
}

export function resultToText(
    resultMap: SearchResultMap,
    originalQuery: string[] | null = null
): string[] {
    let lines: string[] = ['# 検索結果'];
    const results = Object.entries(resultMap);

    for (let i: number = 0; results.length > i; i++) {
        const [query, result] = results[i];
        lines.push('## ' + query);
        if (originalQuery) {
            lines.push('-# 元のクエリ：' + originalQuery[i]);
        }

        if (result.length) {
            const legal: string[] = result
                .filter((r) => r.isLegal)
                .map((r, i) => `${i + 1}. ${resultLink(r)}`);

            if (legal.length) {
                lines.push('### 合法：', ...legal);
            }

            const leak: string[] = result
                .filter((r) => !r.isLegal)
                .map((r, i) => `${i + 1}. ${resultLink(r)}`);

            if (leak.length) {
                lines.push('### 違法：', ...leak);
            }
        } else {
            lines.push('### なし');
        }
    }

    if (lines.length === 1) {
        lines.push('## なし');
    }

    return lines;
}

export function splitText(lines: string[], maxLength: number = 2000): string[] {
    const contents: string[] = [];

    let text: string = '';

    for (const line of lines) {
        if (text.length + line.length > maxLength) {
            contents.push(text.slice(0, -1));

            text = '';
        }

        text += line + '\n';
    }

    if (text) {
        contents.push(text.slice(0, -1));
    }

    return contents;
}

export function createErrorLog(
    queries: string[],
    command: string,
    isMagazine: boolean,
    e: Error
): string {
    return `コマンド: \`/${command}\`
雑誌か:   \`/${isMagazine ? 'はい' : 'いいえ'}\`
入力:
\`\`\`
${queries.join('\n')}
\`\`\`
エラー内容:
\`\`\`
${(e as any as Error).stack}
\`\`\``;
}
