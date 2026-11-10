import type { GoogleSearchResult } from '../../types';
import { genSearchN } from '../base';
import { attr } from '../../html';
import { describePage, fetchBing } from './common';

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

// 結果1件は class="iusc" のタグで、m 属性に JSON が入っている
const RESULT_TAG = /<[a-z][a-z0-9]*\s[^>]*?class="(?:[^"]*\s)?iusc(?:\s[^"]*)?"[^>]*>/gi;

export function parse(html: string): GoogleSearchResult[] {
    const results: Map<string, GoogleSearchResult> = new Map();

    for (const [tag] of html.matchAll(RESULT_TAG)) {
        const raw = attr(tag, 'm');

        if (!raw) continue;

        try {
            const data = JSON.parse(raw);

            // purl は画像が載っているページのURL
            if (data.purl) results.set(data.purl, { title: data.t, url: data.purl });
        } catch {
            // 壊れた1件で全体を落とさない
        }
    }

    if (!results.size) console.warn('okazuri: bing image search returned no results', describePage(html));

    return Array.from(results.values());
}