import type { SearchResult } from '../types';

/**
 * okazuri-search-api で検索する(GET /okazuri/search)。
 *
 * 検索語はそのまま渡す。API が検索語をローマ字にして、各サイトの検索に問い合わせ、
 * 保存した作品のうち、題名が検索語の語をすべて含むものを返す。書き換え(rewrite)は要らない。
 *
 * live=off は、サイトには問い合わせず、保存した作品(データベース)だけで答える指定(API の既定値でもある)。
 *
 * query は、API が検索に使った検索語(ローマ字にしたもの)。結果の見出しに使える。
 * translationJa(API では translation_ja)は、日本語を含まない検索語(英語、ローマ字)の日本語訳(同じく API が取り、その題名の作品も結果に含めている)。なければ null。
 * translation は、日本語の検索語の英語訳(API が Hitomi.La か Google 翻訳で取り、その題名の作品も結果に含めている)。なければ null。
 * 翻訳エンジンは translator(auto: Hitomi.La、だめなら Google 翻訳 / hitomi / google / none)。既定は auto。
 */
export async function searchOkazuri(
    api: string,
    query: string
): Promise<{ query: string; results: SearchResult[]; translation: string | null; translationJa: string | null }> {
    if (!query) throw Error('okazuri: Title not found');

    const resp = await fetch(api + `/okazuri/search?q=${encodeURIComponent(query)}&live=off`);

    if (!resp.ok) {
        throw Error(
            `okazuri: Status code error from okazuri-search-api: ${resp.status} ${resp.headers.get('server') ?? ''}`
        );
    }

    const body = (await resp.json()) as {
        query?: string;
        results?: (Omit<SearchResult, 'isLegal'> & { is_legal: boolean })[];
        translation?: { text?: string } | null;
        translation_ja?: { text?: string } | null;
    };

    if (!body.query || !body.results) throw Error('okazuri: the search answered without the query or the results');

    return {
        query: body.query,
        translation: body.translation?.text?.trim() || null,
        translationJa: body.translation_ja?.text?.trim() || null,
        results: body.results.map(({ title, website, url, is_legal, language }) => ({ title, website, url, isLegal: is_legal, language })),
    };
}

/** API が一度に受け付ける URL の数(GET /okazuri/title) */
const TITLE_URLS_PER_REQUEST = 10;

/**
 * 作品ページの URL から、作品のタイトルを取る(GET /okazuri/title)。
 *
 * API は保存済みの作品から答え、なければページを読む。URL に余計なもの(クエリ、#以降)が付いていてもよい。
 * 対応していないサイトや、取れなかった URL は除く。API が答えなかったときは例外にする。
 */
export async function titlesByUrls(api: string, urls: string[]): Promise<string[]> {
    const titles: string[] = [];

    for (let i = 0; i < urls.length; i += TITLE_URLS_PER_REQUEST) {
        const part = urls.slice(i, i + TITLE_URLS_PER_REQUEST);
        const resp = await fetch(`${api}/okazuri/title?${part.map((url) => `url=${encodeURIComponent(url)}`).join('&')}`);

        if (!resp.ok) {
            throw Error(
                `okazuri: Status code error from okazuri-search-api: ${resp.status} ${resp.headers.get('server') ?? ''}`
            );
        }

        const body = (await resp.json()) as { results?: { title?: string | null }[] };

        for (const { title } of body.results ?? []) {
            if (title?.trim()) titles.push(title.trim());
        }
    }

    return titles;
}
