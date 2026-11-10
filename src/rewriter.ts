import { romaji } from './romaji';

/**
 * 検索語を、Bing や Google のような一般の検索エンジンに渡しやすい形に書き換える。
 * 掛け算記号は x にして、日本語が含まれていればローマ字にする。
 * okazuri-search-api には、検索語をそのまま渡す(API がローマ字にする)。
 */
export async function rewrite(api: string, text: string) {
    text = text.trim().replaceAll('×', 'x');

    if (hasJapanese(text)) text = await romaji(api, text);

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
