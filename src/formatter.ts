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

    // ~ は1つなら普通の文字。取り消し線になる ~~ のときだけ打ち消す
    // ( ) _ : | ! - はそのまま(リンクの文字に [ ] が無ければ、これらでリンクは壊れない)
    return brackets(
        clipped.replace(/[\\*`<>#@]/g, '\\$&').replace(/~{2,}/g, (m) => m.replace(/~/g, '\\~'))
    );
}

/**
 * [ ] は、対になっているもの([作者] など)は半角のままにする。
 * Discord は、リンクの文字([ ] の中)の [ ] を、1段の入れ子([a [b] c] の [b] の形)までしか、リンクとして読まない。
 * \ で打ち消した [ ] も数えられるので、打ち消しは効かない。そこで、次の [ ] は全角の ［ ］ に置き換える:
 * - 対のないもの、と ]( の ]
 * - 対になった [ ] の中の [ ]([ [Fence 14] ] の内側など)
 */
function brackets(text: string): string {
    // ]( が並ぶと、タイトルの中に別のリンクができる。その ] は先に全角にする
    const chars = Array.from(text.replace(/\]\(/g, '］('));
    const open: number[] = [];
    const wide = new Set<number>();

    chars.forEach((c, i) => {
        if (c === '[') {
            open.push(i);
        } else if (c === ']') {
            const start = open.pop();
            if (start === undefined) {
                wide.add(i);
            } else if (open.length) {
                // 外側の [ がまだ開いている: 入れ子の2段目
                wide.add(start);
                wide.add(i);
            }
        }
    });

    for (const i of open) wide.add(i);

    return chars.map((c, i) => (wide.has(i) ? (c === '[' ? '［' : '］') : c)).join('');
}

/** リンク先の URL を (<…>) に入れても壊れないようにする。 */
export function escapeUrl(url: string): string {
    return url.replace(/[\s()<>]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

// 言語コード(API の language: 2 文字のコードのリスト。題名に言語がなければ [])と国旗。日本語(ja)には国旗を付けない。
// 並びは、結果の並び順(英語、中国語、韓国語…)でもある
const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇺🇸', zh: '🇨🇳', ko: '🇰🇷', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', ru: '🇷🇺', it: '🇮🇹',
    th: '🇹🇭', pt: '🇵🇹', id: '🇮🇩', pl: '🇵🇱', tr: '🇹🇷', vi: '🇻🇳', ar: '🇸🇦',
};

// 言語だけの括弧に入る語(これを消す)。言語の判定は API がしていて、ここは表示から括弧を消すためだけに持つ
const LANGUAGE_WORDS = new Set([
    'EN', 'ENG', 'JP', 'JA', 'JPN', 'CN', 'ZH', 'TW', 'KR', 'KO', 'ES', 'SPA', 'FR', 'DE', 'RU', 'IT',
    'TH', 'PT', 'ID', 'PL', 'TR', 'VN', 'VI', 'JAP', 'RUS', 'VIE',
    'ENGLISH', 'JAPANESE', 'CHINESE', 'KOREAN', 'SPANISH', 'FRENCH', 'GERMAN', 'RUSSIAN', 'ITALIAN', 'THAI',
    'PORTUGUESE', 'INDONESIAN', 'POLISH', 'TURKISH', 'VIETNAMESE', 'ARABIC',
    // 言語コードと並んでよい語(これ以外の語が混じる括弧は、言語の括弧とみなさない: [It Girl] など)
    'SUB', 'SUBS',
]);

// 括弧ごと消す、中国語の言語表記(括弧の中身がこれだけのもの)
const CHINESE_LABEL = /^(中国翻訳|中国語|中文|简体中文|簡體中文|繁體中文|繁体中文|汉化|漢化)$/;
// 先頭の国旗(サイトが付けているもの。リンクの先頭には API の language から付け直す)
const LEADING_FLAGS = /^(?:\p{Regional_Indicator}{2}\s*)+/u;
// [EN] [JP] [English] [CN,EN,JP,KR] [jap / eng] [中国翻訳] のような、言語だけの括弧(全角の空白も含めて消す)
const BRACKET_GROUP = /\s*[\[(【]([^\[\]()【】]{1,40})[\])】]/g;

/**
 * タイトルから、言語の表記(先頭の国旗と、[English] [EN] [中国翻訳] のような言語だけの括弧)を消す。
 * 訳者名の括弧([山嵐个人汉化] など)は残す。どの言語かは API が判定している(languageFlags)。
 */
export function parseTitle(title: string): { text: string } {
    const text = title.trim().replace(LEADING_FLAGS, '').replace(BRACKET_GROUP, (whole, inner: string) => {
        const body = inner.trim();

        if (CHINESE_LABEL.test(body)) return '';

        const words = body.toUpperCase().split(/[\s,/&+-]+/).filter(Boolean);

        return words.length && words.every((w) => LANGUAGE_WORDS.has(w)) ? '' : whole;
    });

    return { text: text.replace(/\s+/g, ' ').trim() };
}

/** API の language(['zh']、['en', 'ko']、[])の国旗(絵文字)。複数あれば横に並べる。日本語と [] には付けない。なければ空文字。 */
export function languageFlags(language: string[] | undefined): string {
    const flags = new Set<string>();

    for (const code of language ?? []) {
        const flag = LANGUAGE_FLAGS[code.trim()];
        if (flag) flags.add(flag);
    }

    return [...flags].join('');
}

/** サイト名を、リンクの文字に入れる形にする(【 】で囲む)。 */
function siteLabel(website: string | undefined): string {
    const name = escapeTitle((website ?? '').replace(INVISIBLE, ' ').replace(/\*/g, ''));

    return name ? `【${name}】` : '';
}

/** `1. [【サイト名】 🇨🇳 タイトル](<url>)` の形の、リンクの文字。タイトルがなければ URL だけ。 */
export function resultLink(r: { title: string; url: string; website?: string; language?: string[] }): string {
    const flags = languageFlags(r.language);
    const { text } = parseTitle((r.title ?? '').replace(INVISIBLE, ' '));
    const escaped = escapeTitle(text);
    if (!escaped) return r.url;

    const head = [siteLabel(r.website), flags].filter(Boolean).join(' ');

    return `[${head ? head + ' ' : ''}${escaped}](<${escapeUrl(r.url)}>)`;
}

// 言語の並び順: 判定できない(日本語を含む。日本語には国旗を付けない)ものが先、国旗のあるものは LANGUAGE_FLAGS の順(英語、中国語、韓国語…)
const FLAG_ORDER = Object.values(LANGUAGE_FLAGS);

function languageRank(language: string[] | undefined): number {
    const first = Array.from(languageFlags(language)).slice(0, 2).join('');
    const rank = FLAG_ORDER.indexOf(first);

    return rank < 0 ? 0 : rank + 1;
}

/**
 * 結果を、言語(国旗のないものを先に、国旗のあるものは LANGUAGE_FLAGS の順)、サイト名、タイトルの順に並べる。同じなら元の並びのまま。
 */
export function sortResults<T extends { title: string; website?: string; language?: string[] }>(results: T[]): T[] {
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

    return results
        .map((result, index) => ({ result, index, rank: languageRank(result.language) }))
        .sort(
            (a, b) =>
                a.rank - b.rank ||
                collator.compare(a.result.website ?? '', b.result.website ?? '') ||
                collator.compare(parseTitle(a.result.title ?? '').text, parseTitle(b.result.title ?? '').text) ||
                a.index - b.index
        )
        .map(({ result }) => result);
}

export function resultToText(
    resultMap: SearchResultMap,
    originalQuery: string[] | null = null,
    english: (string | null)[] | null = null,
    sent: string[] | null = null,
    japanese: (string | null)[] | null = null
): string[] {
    let lines: string[] = ['# 検索結果'];
    const results = Object.entries(resultMap);

    for (let i: number = 0; results.length > i; i++) {
        // query は API が検索に使った語(ローマ字)。見出しは入力された語にして、ローマ字と英語訳を添える
        const [query, result] = results[i];
        const original = originalQuery?.[i] ?? query;
        lines.push('## ' + original);
        // ローマ字の行と英語の行は、日本語の語を調べたときだけ。ローマ字や英語で入力された語には、日本語の行を付ける
        // (ローマ字の行は、API に渡した語(sent。なければ見出し)とローマ字に差があるときだけ)
        const asked = sent?.[i] ?? original;
        const flat = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();
        const isJapanese = /[\u3040-\u30ff\u3400-\u9fff]/.test(asked);
        const notes: [string, string][] = [];
        if (isJapanese && flat(asked) !== flat(query)) {
            notes.push(['ローマ字', query]);
        }
        const translated = english?.[i];
        if (isJapanese && translated) {
            notes.push(['英語', escapeTitle(translated)]);
        }
        // 日本語を含まない語(英語、ローマ字)には、日本語の題名の行を付ける
        const japaneseTitle = japanese?.[i];
        if (!isJapanese && japaneseTitle) {
            notes.push(['日本語', escapeTitle(japaneseTitle)]);
        }
        // 「：」の位置は全角スペースで揃える。空白は、並んだ行のいちばん長い見出しに合わせた最小限
        const width = Math.max(0, ...notes.map(([label]) => label.length));
        for (const [label, text] of notes) {
            lines.push(label + '　'.repeat(width - label.length) + '：' + text);
        }

        if (result.length) {
            const legal: string[] = sortResults(result.filter((r) => r.isLegal))
                .map((r, i) => `${i + 1}. ${resultLink(r)}`);

            if (legal.length) {
                lines.push('### 合法：', ...legal);
            }

            const leak: string[] = sortResults(result.filter((r) => !r.isLegal))
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

/**
 * splitText と同じに分けるが、メッセージは maxMessages 通まで。入らない行は後ろから省略し、最後に省略した件数(「1. 」のように番号で始まる行の数)を添える。
 * 見出しだけが残らないよう、省略のすぐ前の見出し行も外す。
 */
export function splitTextWithin(lines: string[], maxMessages: number = 2, maxLength: number = 2000): string[] {
    const whole = splitText(lines, maxLength);

    if (whole.length <= maxMessages) {
        return whole;
    }

    const omittedNote = (kept: number): string => {
        const omitted = lines.slice(kept).filter((l) => /^\d+\. /.test(l)).length;

        return `…ほか ${omitted} 件は省略しました`;
    };

    for (let kept = lines.length - 1; kept >= 0; kept--) {
        let end = kept;

        while (end > 0 && lines[end - 1].startsWith('#')) {
            end--;
        }

        const messages = splitText([...lines.slice(0, end), omittedNote(end)], maxLength);

        if (messages.length <= maxMessages) {
            return messages;
        }
    }

    return splitText([omittedNote(0)], maxLength);
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
