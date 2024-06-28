import { getHitomiLaGalleryInfo } from "./websites.js";

export const PARENTHE_PATTERN = /`[（）「」\(\)\[\]]+`/g;
export const DOUBLE_SPACE_PATTERN = /` {2,}`/g;
export const SHARP_PATTERN = /#|%23/g;
export const LOCALE_QUERY_PATTERN = /([?&])(locale=[A-Za-z_]+)&?/g;

export async function noClean(s: string): Promise<string> {
    return s;
}

export function deleteSharp(s: string): string {
    const match = SHARP_PATTERN.exec(s);

    if (match && match.index) {
        s = s.slice(0, match.index);
    }

    return s;
}

export async function deleteLocale(s: string): Promise<string> {
    return s.replaceAll(LOCALE_QUERY_PATTERN, "$1");
}

export async function hitomiLaReaderToInfo(s: string): Promise<string> {
    if (s.startsWith("https://hitomi.la/reader/")) {
        try {
            const info = await getHitomiLaGalleryInfo(s);

            return "https://hitomi.la" + info.galleryUrl + "#1";
        } catch {}
    }

    return s;
}

export const viewToGallery = readerToInfoCleaner(/\/view\/(\d+)\/\d+\/?/g, "/gallery/$1/");
export const EpsToPage = readerToInfoCleaner(/\/(?:page|eps)\/([^/]+)\/?\d*/g, "/page/$1");

export function strip(s: string): string {
    s = s.replaceAll(PARENTHE_PATTERN, " ");

    s = s.replaceAll(DOUBLE_SPACE_PATTERN, " ");

    return s.trim();
}

export function readerToInfoCleaner(pattern: RegExp, repl: string): StringToPromiseString {
    return async (s: string): Promise<string> => s.replaceAll(pattern, repl);
}
