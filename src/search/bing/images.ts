import { load } from 'cheerio';
import type { GoogleSearchResult } from '../../types';
import { genSearchN } from '../base';

export const searchN = genSearchN(search, 1);

export async function search(query: string, start: number): Promise<GoogleSearchResult[]> {
    query = encodeURIComponent(query);
    start++;

    /* safeSearch
    - Strict
    - Moderate
    - Off
    */
    const params = new URLSearchParams({
        q: query,
        first: start.toString(),
        FORM: '',
        safeSearch: 'Off',
        mkt: 'ja-jp',
        setLang: 'ja-jp',
    });
    const resp = await fetch('https://www.bing.com/images/async?' + params.toString());

    if (!resp.ok) {
        throw Error('okazuri: Status code error from bing');
    }

    return parse(await resp.text());
}

function parse(html: string): GoogleSearchResult[] {
    const results: Set<GoogleSearchResult> = new Set();

    const $ = load(html);
    for (const el of $('.iusc').toArray()) {
        const raw: string | undefined = $(el).attr('m');

        if (raw) {
            const data = JSON.parse(raw);
            results.add({
                title: data.t,
                url: data.purl,
            });
        }
    }

    return Array.from(results);
}
