import { env } from "./env.js";

export async function googleN(
    query: string,
    step: number,
    count: number
): Promise<GoogleSearchResult[]> {
    let start: number = 0;

    const results: Map<string, GoogleSearchResult> = new Map();

    while (count > 0) {
        const tmpResults = await google(query, start);

        for (const result of tmpResults) {
            results.set(result.url, result);
        }

        start += step;

        count--;
    }

    return [...results.values()];
}

export async function google(query: string, start: number): Promise<GoogleSearchResult[]> {
    query = encodeURIComponent(query);

    const resp = await fetch(env.OKAZURI_API_URL + `/search?q=${query}&start=${start}`);

    if (!resp.ok) {
        throw Error("okazuri: Status code error from google");
    }

    return await resp.json();
}
