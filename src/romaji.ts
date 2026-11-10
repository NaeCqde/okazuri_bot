//const OKAZURI_API_URL = "http://127.0.0.1:8000";

/**
 * 日本語をローマ字にする。okazuri-search-api の GET /romaji を使う(text/plain で返る)。
 */
export async function romaji(api: string, query: string): Promise<string> {
    const resp = await fetch(api + `/romaji?q=${encodeURIComponent(query)}`);

    if (!resp.ok) {
        throw Error(`okazuri: Status code error from romaji: ${resp.status} ${resp.headers.get('server') ?? ''}`);
    }

    return await resp.text();
}

// romaji("チートアイテム管理局のお仕事").then((t) => console.log(t));
