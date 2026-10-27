import { load } from 'cheerio';

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

// レーベルの作品一覧(新しい順)。同じ販売日の中では、単話が先で雑誌が後に並ぶ
export function labelListUrl(labelId: string, page: number): string {
    return (
        'https://www.dlsite.com/books/fsr/=/language/jp/sex_category[0]/male/ana_flg/all' +
        `/order/release_d/options_and_or/and/label_id/${labelId}/per_page/${PER_PAGE}/page/${page}`
    );
}

export function productUrl(id: string): string {
    return `https://www.dlsite.com/books/work/=/product_id/${id}.html`;
}

export async function fetchHtml(url: string): Promise<string> {
    const resp = await fetch(url, { headers: HEADERS });

    if (!resp.ok) {
        throw Error(`okazuri: Status code error from dlsite: ${resp.status} ${url}`);
    }

    return await resp.text();
}

export function parseList(html: string): ListItem[] {
    const $ = load(html);

    return $('#search_result_img_box li[data-list_item_product_id]')
        .toArray()
        .map((el) => {
            const li = $(el);
            const link = li.find('dd.work_name a').first();
            const author = li.find('dd.maker_name .author a[href*="/author_id/"]').first();

            return {
                id: li.attr('data-list_item_product_id') as string,
                type: productType(li.find('.work_category').first().attr('class') ?? ''),
                name: (link.attr('title') ?? link.text()).trim(),
                authorId: author.attr('href')?.match(/\/author_id\/(\w+)/)?.[1] ?? null,
                authorName: author.text().trim() || null,
            };
        });
}

export function parseDetail(html: string): Detail | null {
    const $ = load(html);

    const cell = (header: string) =>
        $('th')
            .filter((_, th) => $(th).text().trim() === header)
            .first()
            .next('td');

    const match = cell('販売日')
        .text()
        .match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);

    if (!match) return null;

    return {
        date: new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
        labelName: cell('レーベル').find('a').first().text().trim() || null,
    };
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
