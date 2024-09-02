import {
    deleteLocale,
    EpsToPage,
    hitomiLaReaderToInfo,
    noClean,
    strip,
    viewToGallery,
} from "./cleaners.js";

export const HITOMI_LA_ID_PATTERN = /https:\/\/hitomi\.la\/[a-z]+.*(?:\/|-)(\d+)\.html.*/;

export const WEBSITES: Website[] = [
    {
        name: "DLsite",
        isLegal: true,
        pattern:
            /^https:\/\/(?:[A-Za-z]+\.)?dlsite\.com\/[a-z\-]+\/work\/=\/product_id\/RJ\d+\.html.*/,
        title: regexpTitleGetter(
            /<meta property="og:title" content="(?<title>.+) \| DLsite/,
            deleteLocale
        ),
        clean: deleteLocale,
    },
    {
        name: "FANZA",
        isLegal: true,
        pattern: /^https:\/\/(?:[a-z]+\.)?dmm\.co\.jp\/[a-z]+\/[^\/]+\/.+/i,
        title: regexpTitleGetter(
            /<meta property="og:title" content="(?<title>.+)(?:" \/>|\n">)/,
            noClean
        ),
        clean: noClean,
    },
    {
        name: "Hitomi.La",
        isLegal: false,
        pattern: /^https:\/\/hitomi\.la\/[a-z]+\/.+/,
        title: hitomiLaTitle,
        clean: hitomiLaReaderToInfo,
    },
    {
        name: "Anime-Sharing",
        isLegal: false,
        pattern: /^https:\/\/www\.anime-sharing\.com\/threads\/.+/,
        title: regexpTitleGetter(/<title>(?<title>.+) | Anime-Sharing Community<\/title>/, noClean),
        clean: noClean,
    },
    {
        name: "IMHentai",
        isLegal: false,
        pattern: /^https:\/\/imhentai\.xxx\/[a-z]+\/\d+.*/,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, viewToGallery),
        clean: viewToGallery,
    },
    {
        name: "momon:GA",
        isLegal: false,
        pattern: /^https:\/\/momon-ga\.com\/(?:fanzine|magazine)\/mo\d+.*/i,
        title: regexpTitleGetter(
            /<h1>(?<title>.+)<\/h1>(?:(?:\n|\t|.)+作者<\/div>.+https:\/\/momon-ga\.com\/cartoonist\/[^ ]+ rel="tag">(?<artist>[^<]+)?<\/a>)/,
            noClean
        ),
        clean: noClean,
    },
    {
        name: "Nya:Hentai",
        isLegal: false,
        pattern: /^https:\/\/nyahentai\.re\/(?:fanzine|magazine)\/re\d+.*/i,
        title: regexpTitleGetter(
            /<h1>(?<title>.+)<\/h1>(?:(?:\n|\t|.)+\/circle\/[^"]+" rel="tag">(?<circle>[^"]+)?<\/a>(?:\n|\t|.)+\/artist\/[^"]+" rel="tag">(?<artist>[^"]+)?<\/a>)?/,
            noClean
        ),
        clean: noClean,
    },
    {
        name: "同人の森",
        isLegal: false,
        pattern: /^https:\/\/doujinnomori\.com\/comics\/detail\/?\?uuid=[a-z\d\-]+.*/i,
        title: regexpTitleGetter(/<title>(?<title>.+) \| 同人の森/, noClean),
        clean: noClean,
    },
    {
        name: "JComic",
        isLegal: false,
        pattern: /^https:\/\/jcomic\.net\/(?:page|eps)\/[^\/]+.*/i,
        title: regexpTitleGetter(
            /<h1>(?<title>.+)<\/h1>(?:<a href="\/author\/(?<artist>[^"]+)?")?/,
            EpsToPage
        ),
        clean: EpsToPage,
    },
    {
        name: "R18Best",
        isLegal: false,
        pattern: /^https:\/\/r18\.best\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiOMG",
        isLegal: false,
        pattern: /^https:\/\/hentaiomg\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiCore",
        isLegal: false,
        pattern: /^https:\/\/www\.hentaicore\.net\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "Sukebei",
        isLegal: false,
        pattern: /^https:\/\/sukebei\.nyaa\.si\/view\/(?:\d+|[a-zA-Z0-9]+).*/i,
        title: regexpTitleGetter(/<title>(?<title>.+) \| Sukebei \| Nyaa/, noClean),
        clean: noClean,
    },
    {
        name: "NijiGazo",
        isLegal: false,
        pattern: /^https:\/\/niji-gazo\.com\/view\/\d+.*/i,
        title: regexpTitleGetter(/<title>(?<title>.+) \| NijiGazo/, noClean),
        clean: noClean,
    },
    {
        name: "RokuHentai",
        isLegal: false,
        pattern: /^https:\/\/rokuhentai\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiEnvy",
        isLegal: false,
        pattern: /^https:\/\/hentaienvy\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiEra",
        isLegal: false,
        pattern: /^https:\/\/hentaiera\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "MasDr",
        isLegal: false,
        pattern: /^https:\/\/mas-dr\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "JMwu",
        isLegal: false,
        pattern: /^https:\/\/m\.jmwu\.vip\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "NukiBooks",
        isLegal: false,
        pattern: /^https:\/\/nukibooks\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "177Picyy",
        isLegal: false,
        pattern: /^http:\/\/www\.177picyy\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "BatoTo",
        isLegal: false,
        pattern: /^https:\/\/bato\.to\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "Wnacg",
        isLegal: false,
        pattern: /^https:\/\/www\.wnacg\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiName",
        isLegal: false,
        pattern: /^https:\/\/www\.hentai\.name\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiDesi",
        isLegal: false,
        pattern: /^http:\/\/jp\.hentai\.desi\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "AsmHentai",
        isLegal: false,
        pattern: /^https:\/\/asmhentai\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "HentaiPaw",
        isLegal: false,
        pattern: /^https:\/\/hentaipaw\.com\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
    {
        name: "EHentai",
        isLegal: false,
        pattern: /^https:\/\/e-hentai\.org\/[a-z]+\/\d+.*/i,
        title: regexpTitleGetter(/<h1>(?<title>.+)<\/h1>/, noClean),
        clean: noClean,
    },
];

export function regexpTitleGetter(
    pattern: RegExp,
    cleaner: StringToPromiseString
): (s: string) => Promise<string> {
    return async function (s: string): Promise<string> {
        s = await cleaner(s);

        if (s) {
            let resp: Response;

            try {
                resp = await fetch(s, {
                    headers: {
                        cookie: s.startsWith("https://book.dmm.co.jp/")
                            ? "_dd_s=; reco=iecgms; ckcy=1; is_intarnal=true; age_check_done=1"
                            : "",
                    },
                });
            } catch {
                return "";
            }

            if (resp.status === 200) {
                const match = pattern.exec(await resp.text());

                if (match && match.groups && match.groups["title"]) {
                    let title: string = match.groups["title"] + " ";

                    if (match.groups["artist"]) {
                        title += match.groups["artist"];
                    }

                    return strip(title);
                }
            }
        }

        return "";
    };
}

export async function hitomiLaTitle(s: string): Promise<string> {
    let info: HitomiLaGalleryInfo;

    try {
        info = await getHitomiLaGalleryInfo(s);
    } catch {
        return "";
    }

    let title: string = info.japaneseTitle + " ";

    if (info.artists && info.artists.length) {
        title += info.artists[0].artist;
    }

    return strip(title);
}

export async function getHitomiLaGalleryInfo(s: string): Promise<HitomiLaGalleryInfo> {
    const match = HITOMI_LA_ID_PATTERN.exec(s);

    if (match && match.length === 2) {
        const resp = await fetch("https://ltn.hitomi.la/galleries/" + match[1] + ".js");

        if (resp.status === 200) {
            const text = (await resp.text()).replace("var galleryinfo = ", "");

            const rawInfo: any = JSON.parse(text);

            return {
                title: rawInfo["title"],
                id: rawInfo["id"],
                artists: rawInfo["artists"],
                galleryUrl: rawInfo["galleryurl"],
                japaneseTitle: rawInfo["japanese_title"],
            };
        }
    }

    throw Error("okazuri: Failed to get hitomi.la id");
}
