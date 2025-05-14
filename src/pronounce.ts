import { env } from './env.js';
//const OKAZURI_API_URL = "http://127.0.0.1:8000";

export async function pronounce(query: string): Promise<string> {
    const resp = await fetch(env.OKAZURI_API_URL + `/pronounce?q=${encodeURIComponent(query)}`);

    if (!resp.ok) {
        throw Error('okazuri: Status code error from pykakasi');
    }

    return await resp.text();
}

// pronounce("チートアイテム管理局のお仕事").then((t) => console.log(t));
