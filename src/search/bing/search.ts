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
    const resp = await fetch('https://www.bing.com/search?' + params.toString());

    if (!resp.ok) {
        throw Error('okazuri: Status code error from bing');
    }

    return parse(await resp.text());
}

function parse(html: string): GoogleSearchResult[] {
    return [];
}

/* POST /bing/redirect
content-type: application/json
json: string[]
response:
200 OK: string[]
400 Bad Request: { message: string }
*/
export async function getLocation(url: string): Promise<string> {
    const resp = await fetch(url, { redirect: 'manual' });

    // 307 = Internal Redirect
    if (resp.status === 307) {
        return resp.headers.get('Location') as string;
    }

    throw Error('okazuri: Failed to get redirect location');
}
