import type { Command, DiscordHono } from 'discord-hono';
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

export type DiscordHonoBot = DiscordHono<
    {
        Bindings: Pick<Env, 'DB'>;
        Variables: Omit<Env, 'DB'>;
    },
    string
>;

export interface CommandSet {
    command: Command<{}>;
    handler: CommandHandler<EnvTypes>;
}

export interface EnvTypes {
    Bindings: Pick<Env, 'DB'>;
    Variables: Omit<Env, 'DB'>;
}
