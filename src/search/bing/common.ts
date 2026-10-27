// Bing のスクレイパーの共通部分(Workers の fetch だけで動く)

// Workers の既定の User-Agent だと弾かれることがあるので、ブラウザのものにする。
// SRCHHPGUSR=ADLT=OFF は SafeSearch を切る Cookie
export const BING_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept-Language': 'ja,en;q=0.8',
    Cookie: 'SRCHHPGUSR=ADLT=OFF',
};

export async function fetchBing(url: string): Promise<string> {
    const resp = await fetch(url, { headers: BING_HEADERS });

    if (!resp.ok) {
        throw Error(`okazuri: Status code error from bing: ${resp.status}`);
    }

    return await resp.text();
}

/**
 * 検索結果のリンクは Bing の中継URL(https://www.bing.com/ck/a?...&u=a1<base64url>)になっている。
 * u の先頭の a1 を除いた残りが、遷移先のURLの base64url なので、通信せずに復元できる。
 * 中継URLでなければ、そのまま返す。
 */
export function decodeBingUrl(href: string): string {
    try {
        const url = new URL(href);
        const encoded = url.searchParams.get('u');

        if (url.hostname.endsWith('bing.com') && url.pathname.startsWith('/ck/') && encoded?.startsWith('a1')) {
            const b64 = encoded.slice(2).replaceAll('-', '+').replaceAll('_', '/');
            const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), (c) =>
                c.charCodeAt(0)
            );

            return new TextDecoder().decode(bytes);
        }
    } catch {
        // URL として読めないものは、そのまま返す
    }

    return href;
}
