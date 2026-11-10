// HTML を DOM にせず、文字列で必要な部分だけ読むための小さな道具(dlsite.ts, search/bing/*)。
//
// cheerio で DOM にすると、数百KBのページ1枚に数十msの CPU 時間がかかる。Workers の無料プランは
// 1回の実行で CPU 時間が10msまでなので、検索結果のような決まった形のページは文字列で読む。

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
};

/** 文字参照(&amp; &#39; &#x3042; など)を文字にして、前後の空白を除く */
export function decode(text: string): string {
    return text
        .replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (all, dec, hex, name) => {
            if (dec || hex) return String.fromCodePoint(dec ? Number(dec) : parseInt(hex, 16));

            return ENTITIES[name.toLowerCase()] ?? all;
        })
        .trim();
}

/** タグを除いた本文 */
export function stripTags(html: string): string {
    return decode(html.replace(/<[^>]*>/g, ''));
}

/** タグの中の属性の値(name="value")。なければ undefined */
export function attr(tag: string, name: string): string | undefined {
    const value = tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

    return value === undefined ? undefined : decode(value);
}
