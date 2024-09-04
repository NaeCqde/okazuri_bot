import { googleN } from "./google.js";
import { WEBSITES } from "./websites.js";

export async function searchMultiple(queries: string[]): Promise<SearchResultMap> {
    const resultMap: SearchResultMap = {};

    for (const q of queries) {
        let results: SearchResult[] = [];

        try {
            if (/^https?:\/\//.exec(q)) {
                results = await searchByUrl(q);
            } else {
                results = await search(q);
            }
        } catch (e: any) {
            if (
                !["okazuri: Unsupported website", "okazuri: Title not found"].includes(
                    (e as Error).message
                )
            ) {
                throw e;
            }
        }

        resultMap[q] = results;
    }

    return resultMap;
}

export async function searchByUrl(url: string): Promise<SearchResult[]> {
    for (const website of WEBSITES) {
        if (website.pattern.exec(url)) {
            const title: string = await website.title(url);

            return await search(title);
        }
    }

    throw Error("okazuri: Unsupported website");
}

export async function search(query: string): Promise<SearchResult[]> {
    console.log(query);

    if (query) {
        const results = await googleN(query, 8, 3);

        const filteredResults: Map<string, SearchResult> = new Map();

        for (const result of results) {
            for (const website of WEBSITES) {
                console.log(`${website.name}: ${website.pattern.exec(result.url)}`);
                if (website.pattern.exec(result.url)) {
                    const url = await website.clean(result.url);

                    filteredResults.set(url, {
                        title: "",
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
        throw Error("okazuri: Title not found");
    }
}
