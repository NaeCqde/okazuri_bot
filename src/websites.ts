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
