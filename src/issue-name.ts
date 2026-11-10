// 号の名前を、レーベルごとに同じ書式にそろえる(numbers.name)。元のタイトルは numbers.name_raw に残る。
//
// そろえるのは番号の書き方だけ。DLsite の商品名は、同じレーベルでも号によって空白・ゼロ埋め・Vol. の書き方が違う
// (コミックグレープ.Vol.76 / コミックグレープVol.97)。雑誌の名称そのものは変えない:
// comicグレープ と コミックグレープ、COMIC X-EROS と COMIC ゼロス は、別の雑誌として別の名前のままにする。
// 新しいレーベルは、ISSUE_SPECS に1行足すと書式が決まる。足すまでは、DLsite の名前から【】の注記を除いたものを使う。
import { issueName, issueNumber } from './dlsite';

type Style = 'year-month' | 'vol' | 'hash' | 'number';

interface Spec {
    /** 号の名前から番号を読み取る順。最初に読み取れたものでそろえる */
    styles: Style[];
    /** vol の書式の接頭辞(既定は Vol.) */
    vol?: string;
    /** number の書式の桁数(ゼロ埋め) */
    digits?: number;
}

export const ISSUE_SPECS: Record<string, Spec> = {
    LBL02690: { styles: ['year-month'] }, // COMIC快楽天
    LBL02558: { styles: ['year-month'] }, // COMIC快楽天ビースト
    LBL02655: { styles: ['year-month'] }, // COMIC失楽天
    LBL03007: { styles: ['year-month'] }, // COMICペンギンクラブ
    LBL00611: { styles: ['number'], digits: 2 }, // COMIC E×E
    LBL03712: { styles: ['vol'] }, // コミックグレープ / comicグレープ
    LBL02544: { styles: ['hash'] }, // COMIC ゼロス / COMIC X-EROS
    LBL00255: { styles: ['vol'] }, // comicアンスリウム / アンスリウム
    LBL02053: { styles: ['vol'] }, // comicクリベロン DUMA
    LBL01003: { styles: ['vol'] }, // コミックマグナム
    // 初期の7号は Vol. がなく、年月だけで呼ばれている
    LBL00334: { styles: ['vol', 'year-month'], vol: 'vol.' }, // COMICエウロパ
};

export interface IssueName {
    /** そろえた名前 */
    name: string;
    /** 号の番号(年月の号は 202611、Vol. や # の号はその番号。読み取れなければ 0) */
    num: number;
}

const pad = (n: number, digits = 2) => String(n).padStart(digits, '0');

/** 番号の書き方(位置)より前が、雑誌の名称。掛け算記号は x にする(入力しやすく、検索でも x と × を区別しない) */
function magazineTitle(text: string, numberStart: RegExp): string {
    const at = text.search(numberStart);
    const head = at < 0 ? text : text.slice(0, at);

    return head
        .replace(/＜.+?＞/g, '')
        .replace(/[\s.\-・]+$/, '')
        .trim()
        .replaceAll('×', 'x');
}

/**
 * 年月の号: 2024年4月号 / 2022年8+9月号合併号 / 2023年11月12月合併号 -> [年, 月, 続く月?]
 * 月と月のあいだは + か 月 で区切られる。
 */
function yearMonth(raw: string): { year: number; month: number; next?: number } | null {
    const m = raw.match(/(\d{4})年\s*(\d{1,2})(?:\s*[+月]\s*(\d{1,2}))?\s*月/);

    return m ? { year: Number(m[1]), month: Number(m[2]), next: m[3] ? Number(m[3]) : undefined } : null;
}

/** 号につく注記。＜サブロー先生小冊子付き限定版＞COMIC…、2018年05月号 5周年記念特別小冊子付き など */
function annotation(raw: string): string | null {
    const brackets = raw.match(/＜(.+?)＞/)?.[1];
    const trailing = raw.match(/月(?:号)?(?:合併号)?\s+(\S.*)$/)?.[1];

    return (brackets ?? trailing)?.trim() || null;
}

/**
 * DLsite の商品名を、そのレーベルの書式にそろえる。読み取れないときは、【】の注記を除いただけの名前。
 *
 * 注記(＜…＞や、年月のあとの文)は、通常の号と区別するために【】で名前の最後につける。
 */
export function normalizeIssueName(magazineId: string, raw: string): IssueName {
    const spec = ISSUE_SPECS[magazineId];
    const fallback = { name: issueName(raw), num: issueNumber(raw) };

    if (!spec) return fallback;

    // 【デジタル特装版】などは、通常の号と同じ号として扱うので、名前には入れない
    const text = issueName(raw);
    const note = annotation(text);
    const suffix = note ? `【${note}】` : '';

    for (const style of spec.styles) {
        switch (style) {
            case 'year-month': {
                const ym = yearMonth(text);
                const title = magazineTitle(text, /\d{4}年/);
                if (!ym || !title) break;

                const months = ym.next ? `${pad(ym.month)}+${pad(ym.next)}月合併号` : `${pad(ym.month)}月号`;

                return { name: `${title} ${ym.year}年${months}${suffix}`, num: ym.year * 100 + ym.month };
            }
            case 'vol': {
                const n = text.match(/vol\.?\s*(\d+)/i)?.[1];
                const title = magazineTitle(text, /vol/i);
                if (!n || !title) break;

                return { name: `${title} ${spec.vol ?? 'Vol.'}${Number(n)}${suffix}`, num: Number(n) };
            }
            case 'hash': {
                const n = text.match(/#\s*(\d+)/)?.[1];
                const title = magazineTitle(text, /#/);
                if (!n || !title) break;

                return { name: `${title} #${Number(n)}${suffix}`, num: Number(n) };
            }
            case 'number': {
                const n = text.match(/(\d+)\s*$/)?.[1];
                const title = magazineTitle(text, /\d+\s*$/);
                if (!n || !title) break;

                return { name: `${title} ${pad(Number(n), spec.digits)}${suffix}`, num: Number(n) };
            }
        }
    }

    return fallback;
}
