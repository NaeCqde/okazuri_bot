import { decode, stripTags } from './html';

export const PER_PAGE = 100;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; okazuri-bot)',
    'Accept-Language': 'ja',
    // 年齢確認を済ませた状態にする
    Cookie: 'adultchecked=1; locale=ja_JP',
};

export type ProductType = 'magazine' | 'oneshot' | 'other';

export interface ListItem {
    id: string;
    type: ProductType;
    name: string;
    authorId: string | null;
    authorName: string | null;
}

export interface Detail {
    date: Date;
    labelName: string | null;
}

// レーベルの作品一覧(古い順)。同じ販売日の中では、雑誌が先で単話が後に並ぶ
export function labelListUrl(labelId: string, page: number): string {
    return (
        'https://www.dlsite.com/books/fsr/=/language/jp/sex_category[0]/male/ana_flg/all' +
        `/order/release/options_and_or/and/label_id/${labelId}/per_page/${PER_PAGE}/page/${page}`
    );
}

export function productUrl(id: string): string {
    return `https://www.dlsite.com/books/work/=/product_id/${id}.html`;
}

export class HttpError extends Error {
    constructor(
        readonly status: number,
        url: string
    ) {
        super(`okazuri: Status code error from dlsite: ${status} ${url}`);
    }
}

export async function fetchHtml(url: string): Promise<string> {
    const resp = await fetch(url, { headers: HEADERS });

    if (!resp.ok) {
        throw new HttpError(resp.status, url);
    }

    return await resp.text();
}

const ITEM_START = 'data-list_item_product_id="';

export function parseList(html: string): ListItem[] {
    const items: ListItem[] = [];

    // 検索結果の外(おすすめなど)にも商品が並ぶので、検索結果の中だけを読む
    let pos = html.indexOf('id="search_result_img_box"');
    if (pos < 0) return items;

    for (;;) {
        pos = html.indexOf(ITEM_START, pos);
        if (pos < 0) break;

        const idStart = pos + ITEM_START.length;
        const idEnd = html.indexOf('"', idStart);
        // 1つの商品は <dl> の中に収まっている
        const end = html.indexOf('</dl>', idEnd);
        const block = html.slice(idEnd, end < 0 ? undefined : end);

        pos = idEnd;
        items.push(parseItem(html.slice(idStart, idEnd), block));
    }

    return items;
}

function parseItem(id: string, block: string): ListItem {
    const name = block.match(/<dd class="work_name">[\s\S]*?(<a\s[^>]*>)([\s\S]*?)<\/a>/);
    const title = name?.[1].match(/\stitle="([^"]*)"/)?.[1];

    const maker = block.match(/<dd class="maker_name">([\s\S]*?)<\/dd>/)?.[1] ?? '';
    const author = maker.match(/<a\s[^>]*href="[^"]*\/author_id\/(\w+)[^"]*"[^>]*>([\s\S]*?)<\/a>/);

    return {
        id,
        type: productType(block.match(/class="((?:[^"]*\s)?work_category(?:\s[^"]*)?)"/)?.[1] ?? ''),
        name: title !== undefined ? decode(title) : stripTags(name?.[2] ?? ''),
        authorId: author?.[1] ?? null,
        authorName: (author && stripTags(author[2])) || null,
    };
}

export function parseDetail(html: string): Detail | null {
    // 販売日はページ上部の表にあるので、そこまでの文字列から探す
    const date = cell(html, '販売日')?.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);

    if (!date) return null;

    const label = cell(html, 'レーベル')?.match(/<a\s[^>]*>([\s\S]*?)<\/a>/);

    return {
        date: new Date(Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]))),
        labelName: (label && stripTags(label[1])) || null,
    };
}

// <th>header</th><td>…</td> の td の中身(HTML)
function cell(html: string, header: string): string | null {
    const m = html.match(new RegExp(`<th>\\s*${header}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`));

    return m?.[1] ?? null;
}

function productType(className: string): ProductType {
    if (className.includes('type_magazine')) return 'magazine';
    if (className.includes('type_oneshot')) return 'oneshot';

    return 'other';
}

// "COMIC快楽天 2026年11月号" -> 202611, "COMIC E×E 74" -> 74
export function issueNumber(name: string): number {
    const ym = name.match(/(\d{4})年\s*(\d{1,2})月号/);
    if (ym) return Number(ym[1]) * 100 + Number(ym[2]);

    const n = issueName(name).match(/(\d+)\s*$/);

    return n ? Number(n[1]) : 0;
}

// 【電子版限定特典付き】などの販売形態の注記を除く
export function issueName(name: string): string {
    return name.replace(/【[^】]*】/g, '').trim();
}
