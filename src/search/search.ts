import type { GoogleSearchResult, SearchResult, SearchResultMap } from '../types';
import { searchOkazuri } from './okazuri';
import { rewrite } from '../rewriter';
import { searchN as searchImagesN } from './bing/images';
import { searchN as searchWebN } from './bing/search';
import { WEBSITES } from '../websites';

/**
 * 検索語ごとに、okazuri-search-api で検索する。
 * 結果の見出し(キー)は、API が検索に使った検索語(ローマ字にしたもの)。検索できなかった語は、そのままの語。
 * english は、検索語(重複を除いた順)ごとの英語訳。API が英語訳の題名でも検索している。訳がない語は null。
 */
export async function searchMultiple(
    api: string,
    queries: string[]
): Promise<{ resultMap: SearchResultMap; english: (string | null)[]; japanese: (string | null)[] }> {
    const resultMap: SearchResultMap = {};
    const english: (string | null)[] = [];
    const japanese: (string | null)[] = [];

    // the queries do not depend on each other: they are asked together, and put in the order of the queries
    const answers = await Promise.all(
        [...new Set(queries)].map(async (q) => {
            try {
                return await searchOkazuri(api, q);
            } catch (e: any) {
                if (
                    !['okazuri: Unsupported website', 'okazuri: Title not found'].includes(
                        (e as Error).message
                    )
                ) {
                    throw e;
                }

                return { query: q, results: [] as SearchResult[], translation: null, translationJa: null };
            }
        })
    );

    for (const { query, results, translation, translationJa } of answers) {
        resultMap[query] = results;
        english.push(translation);
        japanese.push(translationJa);
    }

    return { resultMap, english, japanese };
}

export async function titleByUrl(url: string): Promise<string> {
    for (const website of WEBSITES) {
        if (website.pattern.exec(url)) {
            const title: string = await website.title(url);

            return title;
        }
    }

    throw Error('okazuri: Unsupported website');
}

/**
 * Bing で検索する。画像検索(画像が載っているページ)が結果を返すなら、それだけを使う。
 * 画像検索が使えない(失敗した、結果がない)ときだけ、Web 検索にする。
 *
 * 画像検索はセーフサーチを切った結果を返すので、成人向けのサイトのページが出る。
 * Web 検索は、セーフサーチの設定にかかわらず、一般向けのサイトしか返さない(2026-10 に確認)。
 * どちらも Workers の fetch だけで動く。
 */
export async function searchBing(query: string): Promise<GoogleSearchResult[]> {
    try {
        const images = await searchImagesN(query, 1);

        if (images.length) return images;

        console.warn(`okazuri: bing image search returned nothing, falling back to web search: ${query}`);
    } catch (e) {
        console.warn('okazuri: bing image search failed, falling back to web search', e);
    }

    return await searchWebN(query, 1);
}

/**
 * Bing で検索して、対応しているサイトのページだけを返す(okazuri-search-api を使わない検索)。
 * 検索語の書き換え(rewrite)は、Bing や Google のような一般の検索エンジンに渡すときだけ行う。
 */
export async function searchByBing(api: string, query: string): Promise<SearchResult[]> {
    console.log(query);

    if (query) {
        const results = await searchBing(await rewrite(api, query));

        const filteredResults: Map<string, SearchResult> = new Map();

        for (const result of results) {
            for (const website of WEBSITES) {
                //console.log(`${website.name}: ${website.pattern.exec(result.url)}`);
                if (website.pattern.exec(result.url)) {
                    const url = await website.clean(result.url);

                    filteredResults.set(url, {
                        title: '',
                        url: url,
                        isLegal: website.isLegal,
                        website: website.name,
                    });
                }
            }
        }
        console.log(...filteredResults.values());

        return [...filteredResults.values()];
    } else {
        throw Error('okazuri: Title not found');
    }
}
