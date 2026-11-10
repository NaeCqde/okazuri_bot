import type { GoogleSearchResult } from '../../types';
import { genSearchN } from '../base';
import { attr, stripTags } from '../../html';
import { decodeBingUrl, describePage, fetchBing } from './common';

// 1ページ10件。start は件数のオフセット
export const searchN = genSearchN(search, 10);

export async function search(query: string, start: number): Promise<GoogleSearchResult[]> {
    // q は URLSearchParams がエンコードするので、ここではエンコードしない
    const params = new URLSearchParams({
        q: query,
        first: String(start + 1),
        mkt: 'ja-JP',
        setlang: 'ja',
        adlt: 'off',
    });

    return parse(await fetchBing('https://www.bing.com/search?' + params.toString()));
}

// 結果1件は <li class="b_algo"> で、見出し <h2> の中のリンクが結果のタイトルとURL
const RESULT_START = /<li\b[^>]*\bclass="(?:[^"]*\s)?b_algo(?:\s[^"]*)?"[^>]*>/g;

export function parse(html: string): GoogleSearchResult[] {
    // 結果の一覧そのものがないときは、検索結果ではないページ(確認画面など)
    if (!/\sid=["']?b_results["'\s>]/.test(html)) {
        console.warn('okazuri: bing web search is not a results page', describePage(html));

        throw Error('okazuri: Unexpected response from bing');
    }

    const results: Map<string, GoogleSearchResult> = new Map();
    const starts = [...html.matchAll(RESULT_START)].map((m) => m.index);

    starts.forEach((start, i) => {
        const block = html.slice(start, starts[i + 1] ?? html.length);
        const heading = block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1];
        const link = heading?.match(/<a\s[^>]*>([\s\S]*?)<\/a>/);
        const href = link && attr(link[0], 'href');

        if (!link || !href) return;

        results.set(decodeBingUrl(href), { title: stripTags(link[1]), url: decodeBingUrl(href) });
    });

    if (!results.size) console.warn('okazuri: bing web search returned no results', describePage(html));

    return Array.from(results.values());
}