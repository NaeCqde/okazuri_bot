interface Env {
    APPLICATION_ID: string;
    PUBLIC_KEY: string;
    BOT_TOKEN: string;
    GOOGLE_SEARCH_URL: string;
    ERROR_LOG_WEBHOOK: string;

    DB: D1Database;
}

interface SearchResult {
    title: string;
    website: string;
    url: string;
    isLegal: boolean;
}

type SearchResultMap = Record<string, SearchResult[]>;

type GoogleSearchResult = Omit<SearchResult, "website" | "isLegal">;

type StringToString = (s: string) => string;

type StringToPromiseString = (s: string) => Promise<string>;

interface Website {
    name: string;
    isLegal: boolean;
    pattern: RegExp;
    title: StringToPromiseString;
    clean: StringToPromiseString;
}

interface HitomiLaGalleryInfo {
    title: string;
    id: string;
    artists?: { url: string; artist: string }[] | undefined;
    galleryUrl: string;
    japaneseTitle: string;
}
