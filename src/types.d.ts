export interface SearchResult {
    title: string;
    website: string;
    url: string;
    isLegal: boolean;
    /** okazuri-search-api が題名から判定した言語: 2 文字のコードのリスト(['zh', 'en'])。題名に言語がなければ []。他の検索にはない */
    language?: string[];
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
