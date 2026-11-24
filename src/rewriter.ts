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

// ひらがな、カタカナ、漢字のどれか
const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

const hasJapanese = (target: string) => JAPANESE.test(target);
