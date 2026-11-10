// 号の名前の検索(/works の候補と、入力された号の特定)。
//
// 「Vol.」「年」「月号」などの書き方は見ず、雑誌名と番号だけで照合する。
//   快楽天 2026 7  ->  COMIC快楽天 2026年07月号
//   E×E 100        ->  COMIC ExE 100
//   マグナム 123    ->  コミックマグナム Vol.123
// 掛け算記号(×)は x として扱うので、x でも × でも同じ号が出る。

export interface NameKey {
    /** 雑誌名の部分。小文字にして、記号・空白・「Vol.」「年」「月号」などを除いたもの */
    text: string;
    /** 番号(数字のかたまり)。年月の号なら [2026, 7] */
    nums: string[];
}

// 番号の書き方を表すだけで、号の特定には使わない語や記号
const NOISE = /vol\.?|年|月|号|合併|[#+.\-・\s]/g;

export function nameKey(input: string): NameKey {
    // NFKC で、全角の英数字を半角にし、全角の x も x にする
    const text = input.normalize('NFKC').toLowerCase().replace(/[×✕✖]/g, 'x');

    return {
        text: text.replace(/\d+/g, '').replace(NOISE, ''),
        nums: text.match(/\d+/g) ?? [],
    };
}

const stripZeros = (n: string) => n.replace(/^0+/, '');

/** 2026 と 2026、7 と 07 は同じ番号 */
const sameNumber = (a: string, b: string) => stripZeros(a) === stripZeros(b);

/** 入力途中の番号。1 は 1, 10, 100 の先頭、07 の入力途中の 0 も 07 の先頭 */
function prefixOf(query: string, number: string): boolean {
    const stripped = stripZeros(query);

    return number.startsWith(query) || (stripped !== '' && stripZeros(number).startsWith(stripped));
}

/**
 * 雑誌名と番号が合うか。番号は先頭から順に比べる(年と月の順)。
 * exact でないときは、最後の番号だけ入力途中として前方一致にする。
 * 番号は多く入力されても、足りなくても構わない(足りなければ、そこで比べるのをやめる)。
 */
export function matches(query: NameKey, name: NameKey, exact = false): boolean {
    if (query.text && !name.text.includes(query.text)) return false;
    if (query.nums.length > name.nums.length) return false;

    return query.nums.every((number, i) => {
        const last = i === query.nums.length - 1;

        return last && !exact ? prefixOf(number, name.nums[i]) : sameNumber(number, name.nums[i]);
    });
}

/**
 * 雑誌名の末尾が入力と合う号(COMIC快楽天 に 快楽天)を、含むだけの号(COMIC快楽天ビースト)より先にする。
 * 0 が前者。
 */
export function tier(query: NameKey, name: NameKey): 0 | 1 {
    return !query.text || name.text.endsWith(query.text) ? 0 : 1;
}
