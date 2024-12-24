// @ts-ignore
import Kuroshiro from "kuroshiro";
// @ts-ignore
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const kuroshiro = new Kuroshiro();
await kuroshiro.init(new KuromojiAnalyzer());

export async function rewrite(text: string, level: 1 | 2) {
    text = text.trim();
    switch (level) {
        case 1:
            if (!text.match(/hentai/)) text += " hentai";
        case 2:
            text = await kuroshiro.convert(text, { to: "romaji" });
    }

    return text;
}
