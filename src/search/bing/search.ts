import { load } from 'cheerio';
import type { GoogleSearchResult } from '../../types';
import { genSearchN } from '../base';
import { decodeBingUrl, fetchBing } from './common';

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

export function parse(html: string): GoogleSearchResult[] {
    const $ = load(html);

    // 結果の一覧そのものがないときは、検索結果ではないページ(確認画面など)
    if (!$('#b_results').length) {
        throw Error('okazuri: Unexpected response from bing');
    }

    const results: Map<string, GoogleSearchResult> = new Map();

    for (const el of $('li.b_algo').toArray()) {
        const link = $(el).find('h2 a').first();
        const href = link.attr('href');

        if (!href) continue;

        const url = decodeBingUrl(href);

        results.set(url, { title: link.text().trim(), url });
    }

    return Array.from(results.values());
}
