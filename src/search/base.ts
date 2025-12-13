import type { GoogleSearchResult } from '../types';

export function genSearchN(
    searchFunc: (query: string, page: number) => Promise<GoogleSearchResult[]>,
    step: number
) {
    return async function searchN(query: string, count: number): Promise<GoogleSearchResult[]> {
        let start: number = 0;

        const results: Map<string, GoogleSearchResult> = new Map();

        for (let i: number = 0; i < count; i++) {
            const tmpResults = await searchFunc(query, start);

            for (const result of tmpResults) {
                results.set(result.url, result);
            }

            start += step;
        }

        return [...results.values()];
    };
}
