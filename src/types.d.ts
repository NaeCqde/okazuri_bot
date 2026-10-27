export interface SearchResult {
    title: string;
    website: string;
    url: string;
    isLegal: boolean;
}

export type SearchResultMap = Record<string, SearchResult[]>;

export type GoogleSearchResult = Omit<SearchResult, 'website' | 'isLegal'>;

export type StringToString = (s: string) => string;

export type StringToPromiseString = (s: string) => Promise<string>;

export interface Website {
    name: string;
    isLegal: boolean;
    pattern: RegExp;
    title: StringToPromiseString;
    clean: StringToPromiseString;
}

export interface HitomiLaGalleryInfo {
    title: string;
    id: string;
    artists?: { url: string; artist: string }[] | undefined;
    galleryUrl: string;
    japaneseTitle: string;
}

export interface EnvTypes {
    Bindings: Env;
}
