import type { SearchResult } from '../types';

/**
 * okazuri-search-api で検索する(GET /okazuri/search)。
 *
 * 検索語はそのまま渡す。API が検索語をローマ字にして、各サイトの検索に問い合わせ、
 * 保存した作品のうち、題名が検索語の語をすべて含むものを返す。書き換え(rewrite)は要らない。
 *
 * live=diff は、未取得か期限切れ(1ヶ月)の、検索語とサイトの組み合わせだけサイトに問い合わせる指定。
 *
 * query は、API が検索に使った検索語(ローマ字にしたもの)。結果の見出しに使える。
 * translation は、日本語の検索語の英語訳(API が Hitomi.La か Google 翻訳で取り、その題名の作品も結果に含めている)。なければ null。
 * 翻訳エンジンは translator(auto: Hitomi.La、だめなら Google 翻訳 / hitomi / google / none)。既定は auto。
 */
export async function searchOkazuri(
    api: string,
    query: string
): Promise<{ query: string; results: SearchResult[]; translation: string | null }> {
    if (!query) throw Error('okazuri: Title not found');

    const resp = await fetch(api + `/okazuri/search?q=${encodeURIComponent(query)}&live=diff`);

    if (!resp.ok) {
        throw Error(
            `okazuri: Status code error from okazuri-search-api: ${resp.status} ${resp.headers.get('server') ?? ''}`
        );
    }

    const body = (await resp.json()) as {
        query?: string;
        results?: SearchResult[];
        translation?: { text?: string } | null;
    };

    if (!body.query || !body.results) throw Error('okazuri: the search answered without the query or the results');

    return {
        query: body.query,
        translation: body.translation?.text?.trim() || null,
        results: body.results.map(({ title, website, url, isLegal, language }) => ({ title, website, url, isLegal, language })),
    };
}
