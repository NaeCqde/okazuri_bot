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

    const resp = await fetch(
        env.HERMES_API_URL + `?q=${query}&start=${start}` //&sourceid=chrome&ie=UTF-8
    );

    if (resp.status != 200) {
        throw Error("okazuri: Status code error from google");
    }

    const splited1 = (await resp.text()).split("var m={", 2);

    if (splited1.length === 2) {
        const splited2 = splited1[1].split(";var a=m;", 2);

        if (splited2.length === 2) {
            const dataMap: Record<string, any[]> = JSON.parse("{" + splited2[0]);

            const results: GoogleSearchResult[] = [];

            for (const k in dataMap) {
                const data = dataMap[k].filter((v) => v);

                if (data.length >= 4) {
                    if (typeof data[0] === "string" && data[0].startsWith("http")) {
                        if (Array.isArray(data[3]) && data[3].length >= 2) {
                            results.push({
                                title: data[3][0],
                                url: data[0],
                            });
                        }
                    }
                }
            }
            return results;
        }
    }

    throw Error("okazuri: Failed get json");
}
