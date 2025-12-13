import { env } from '../../env.js';
import type { GoogleSearchResult } from '../../types.js';
import { genSearchN } from '../base.js';

export const googleN = genSearchN(search, 20);

export async function search(query: string, start: number): Promise<GoogleSearchResult[]> {
    query = encodeURIComponent(query);

    const resp = await fetch(env.OKAZURI_API_URL + `/search?q=${query}&start=${start}`);

    if (!resp.ok) {
        throw Error('okazuri: Status code error from google');
    }

    return await resp.json();
}
