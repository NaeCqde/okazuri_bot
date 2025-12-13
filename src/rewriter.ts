import { pronounce } from './pronounce';

export async function rewrite(api: string, text: string, level: 1 | 2) {
    text = text.trim();
    switch (level) {
        case 1:
            if (!text.match(/hentai/)) text += ' hentai';
        case 2:
            if (hasJapanese(text)) text = await pronounce(api, text);
    }

    return text;
}

const hasJapanese = (target: string) => {
    // ひらがな
    if (/\p{Script=Hiragana}/u.test(target)) return true;
    // カタカナ
    if (/\p{Script=Katakana}/u.test(target)) return true;
    // 漢字
    if (/\p{Script=Han}/u.test(target)) return true;

    return false;
};
