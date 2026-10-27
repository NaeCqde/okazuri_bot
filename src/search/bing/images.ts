import { load } from 'cheerio';
import type { GoogleSearchResult } from '../../types';
import { genSearchN } from '../base';
import { fetchBing } from './common';

// 1ページ35件ほど。start は件数のオフセット
export const searchN = genSearchN(search, 35);

export async function search(query: string, start: number): Promise<GoogleSearchResult[]> {
    /* safeSearch
    - Strict
    - Moderate
    - Off
    */
    // q は URLSearchParams がエンコードするので、ここではエンコードしない(二重になって別の語を検索してしまう)
    const params = new URLSearchParams({
        q: query,
        first: String(start + 1),
        FORM: '',
        safeSearch: 'Off',
        mkt: 'ja-jp',
        setLang: 'ja-jp',
    });

    return parse(await fetchBing('https://www.bing.com/images/async?' + params.toString()));
}

export function parse(html: string): GoogleSearchResult[] {
    const results: Map<string, GoogleSearchResult> = new Map();

    const $ = load(html);
    for (const el of $('.iusc').toArray()) {
        const raw: string | undefined = $(el).attr('m');

        if (!raw) continue;

        try {
            const data = JSON.parse(raw);

            // purl は画像が載っているページのURL
            if (data.purl) results.set(data.purl, { title: data.t, url: data.purl });
        } catch {
            // 壊れた1件で全体を落とさない
        }
    }

    return Array.from(results.values());
}
