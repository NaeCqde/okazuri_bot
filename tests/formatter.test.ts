import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeTitle, escapeUrl, languageFlags, resultLink, resultToText, sortResults, splitText, splitTextWithin } from '../src/formatter';

const U = 'https://example.com/a';

test('escapes every Discord markdown character', () => {
    assert.equal(escapeTitle('*b* _i_ ~~s~~ ||sp|| `c`'), '\\*b\\* _i_ \\~\\~s\\~\\~ ||sp|| \\`c\\`');
    assert.equal(escapeTitle('a](https://evil.example)[b'), 'a］(https://evil.example)［b');
    assert.equal(escapeTitle('[Hamao] Fallin! [x [y]]'), '[Hamao] Fallin! [x ［y］]');
    assert.equal(escapeTitle('[ Nuko.] Jujutsu 12 ](Jujutsu Kaisen)'), '[ Nuko.] Jujutsu 12 ］(Jujutsu Kaisen)');
    assert.equal(escapeTitle('a [b'), 'a ［b');
    assert.equal(escapeTitle(']a[b]['), '］a[b]［');
    assert.equal(escapeTitle('<@123> <@&1> <#2> <:e:3> @everyone'), '\\<\\@123\\> \\<\\@&1\\> \\<\\#2\\> \\<:e:3\\> \\@everyone');
    assert.equal(escapeTitle('# h > q - l'), '\\# h \\> q - l');
    assert.equal(escapeTitle('back\\slash \\* x'), 'back\\\\slash \\\\\\* x');
});

test('( ) and _ are left as they are, except ( right after ]', () => {
    assert.equal(escapeTitle('Hitsujida (Kumadera) snake_case_name'), 'Hitsujida (Kumadera) snake_case_name');
    assert.equal(escapeTitle('[x](https://evil.example)'), '［x］(https://evil.example)');
});

test('a pair of brackets stays; unpaired ones and the second level become full-width', () => {
    assert.equal(escapeTitle('[Hamao] Fallin\' [Digital]'), "[Hamao] Fallin' [Digital]");
    assert.equal(escapeTitle('(C103) [Hitsujida (Kumadela)] TS'), '(C103) [Hitsujida (Kumadela)] TS');
    // Discord does not link the text when a [ ] has another [ ] inside it, so the inner one is full-width
    assert.equal(escapeTitle('[ [Fence 14] ] Kyoudai [! ]'), '[ ［Fence 14］ ] Kyoudai [! ]');
    assert.equal(escapeTitle('[a [b [c] d] e] f [g]'), '[a ［b ［c］ d］ e] f [g]');
    assert.equal(escapeTitle('a [b'), 'a ［b');
    assert.equal(escapeTitle(']a[b]['), '］a[b]［');
    assert.ok(!/\](?=\()/.test(escapeTitle('a](https://evil.example)')), 'no ]( that could start a link');
});

test('the site name comes first, in 【 】, then the flag', () => {
    assert.equal(resultLink({ title: 'A [English]', url: U, website: 'DLsite', language: ['en'] }), `[【DLsite】 🇺🇸 A](<${U}>)`);
    assert.equal(resultLink({ title: 'A', url: U, website: 'momon:GA' }), `[【momon:GA】 A](<${U}>)`);
    assert.equal(resultLink({ title: 'A', url: U, website: 'a*b[c' }), `[【ab［c】 A](<${U}>)`);
    assert.equal(resultLink({ title: 'A', url: U }), `[A](<${U}>)`);
});

test('a single ~ is left as it is', () => {
    assert.equal(escapeTitle('2026/2/5~2026/4/11 ~Anata~'), '2026/2/5~2026/4/11 ~Anata~');
});

test('title cannot break out of the link', () => {
    const t = '[x](https://evil.example "a") ](<y>)';
    const out = resultLink({ title: t, url: U });
    // the only unescaped "](<" is the real one at the end
    assert.equal(out.match(/(?<!\\)\]\(</g)?.length, 1);
    assert.ok(out.endsWith(`](<${U}>)`));
});

test('control, newline, bidi and zero-width chars become spaces', () => {
    assert.equal(escapeTitle('a\nb\r\nc\td‮evil​!\u0000x'), 'a b c d evil ! x');
});

test('long titles are clipped by code point, not split in a surrogate pair', () => {
    const t = '😀'.repeat(300);
    const e = escapeTitle(t);
    assert.equal(Array.from(e).length, 100);
    assert.ok(e.endsWith('…'));
    assert.ok(!/[\ud800-\udbff]$/.test(e));
});

test('url with brackets and spaces is safe', () => {
    assert.equal(escapeUrl('https://x.test/a b(c)<d>'), 'https://x.test/a%20b%28c%29%3Cd%3E');
    assert.ok(resultLink({ title: 't', url: 'https://x.test/a(b)' }).endsWith('(<https://x.test/a%28b%29>)'));
});

test('empty title falls back to the bare url', () => {
    assert.equal(resultLink({ title: '', url: U }), U);
    assert.equal(resultLink({ title: ' \n ', url: U }), U);
});

test('flags come from the language that the API answers: codes joined with a comma', () => {
    assert.equal(languageFlags(['zh']), '🇨🇳');
    assert.equal(languageFlags(['en']), '🇺🇸');
    assert.equal(languageFlags(['zh', 'en', 'ko']), '🇨🇳🇺🇸🇰🇷');
    assert.equal(languageFlags(['fr', 'it']), '🇫🇷🇮🇹');
    assert.equal(languageFlags(['th']), '🇹🇭');
    assert.equal(languageFlags(['vi']), '🇻🇳');
});

test('flags: Japanese and no language ([]) have no flag', () => {
    assert.equal(languageFlags(['ja']), '');
    assert.equal(languageFlags([]), '');
    assert.equal(languageFlags(undefined), '');
    // only the Japanese flag is left out of a list
    assert.equal(languageFlags(['ja', 'en']), '🇺🇸');
    // several languages: the flags side by side, in the order of the API
    assert.equal(languageFlags(['zh', 'en', 'ja', 'ko']), '🇨🇳🇺🇸🇰🇷');
});

test('the title is not read for its language any more: the flag is the one of the API', () => {
    assert.equal(resultLink({ title: 'x [English]', url: U }), `[x](<${U}>)`, 'the bracket is removed, and there is no flag without a language');
    assert.equal(resultLink({ title: 'x [English]', url: U, language: ['en'] }), `[🇺🇸 x](<${U}>)`);
});

test('link format: flag goes inside the brackets, language brackets are removed', () => {
    assert.equal(resultLink({ title: '[Hamao] Fallin\' [Chinese]', url: U, language: ['zh'] }), `[🇨🇳 [Hamao] Fallin'](<${U}>)`);
    assert.equal(resultLink({ title: 'A (COMIC X 1) [English] [Digital]', url: U, language: ['en'] }), `[🇺🇸 A (COMIC X 1) [Digital]](<${U}>)`);
    assert.equal(resultLink({ title: 'A [中国翻訳] [DL版]', url: U, language: ['zh'] }), `[🇨🇳 A [DL版]](<${U}>)`);
    assert.equal(resultLink({ title: 'A [山嵐个人汉化]', url: U, language: ['zh'] }), `[🇨🇳 A [山嵐个人汉化]](<${U}>)`);
    // the flag the site put first is taken off the title (the API read it), and the Japanese flag is never shown
    assert.equal(resultLink({ title: '🇨🇳 [A] b [Chinese]', url: U, language: ['zh'] }), `[🇨🇳 [A] b](<${U}>)`);
    assert.equal(resultLink({ title: '🇯🇵 A [EN]', url: U, language: ['ja', 'en'] }), `[🇺🇸 A](<${U}>)`);
    assert.equal(resultLink({ title: '🇯🇵 A [JP]', url: U, language: ['ja'] }), `[A](<${U}>)`);
    assert.equal(resultLink({ title: '[English]', url: U, language: ['en'] }), U);
    assert.equal(resultLink({ title: 'A [HD] [It Girl]', url: U, language: [] }), `[A [HD] [It Girl]](<${U}>)`);
    assert.equal(resultLink({ title: 'plain', url: U }), `[plain](<${U}>)`);
});

test('resultToText numbers links and keeps every line short', () => {
    const lines = resultToText({
        q: [
            { title: 'a_b', website: 'w', url: U, isLegal: true },
            { title: 'x'.repeat(5000), website: 'w', url: U, isLegal: false },
        ],
    });
    assert.deepEqual(lines.slice(0, 4), ['# 検索結果', '## q', '### 合法：', `1. [【w】 a_b](<${U}>)`]);
    assert.ok(lines.every((l) => l.length < 400));
    assert.ok(splitText(lines).every((m) => m.length <= 2000));
});

test('results are sorted by language (no flag, i.e. Japanese or unknown, first), site name, then title', () => {
    const r = (title: string, website: string, language?: string[]) => ({ title, website, url: U, isLegal: false, language });
    const sorted = sortResults([
        r('B plain', 'Z'),
        r('A plain', 'A', ['ja']),
        r('x [Korean]', 'A', ['ko']),
        r('y [Chinese]', 'B', ['zh']),
        r('b [English]', 'B', ['en']),
        r('a [English]', 'B', ['en']),
        r('c [English]', 'A', ['en']),
        r('A plain', 'A', []),
    ]).map((x) => `${x.website}:${x.title}`);

    assert.deepEqual(sorted, [
        'A:A plain',
        'A:A plain',
        'Z:B plain',
        'A:c [English]',
        'B:a [English]',
        'B:b [English]',
        'B:y [Chinese]',
        'A:x [Korean]',
    ]);
});

test('the heading is the query that was typed, with the romaji under it when it differs', () => {
    const none = { 'paeto-n kyoushuusen': [] as { title: string; website: string; url: string; isLegal: boolean }[] };

    assert.deepEqual(resultToText(none, ['パエトーン強襲戦']), [
        '# 検索結果',
        '## パエトーン強襲戦',
        'ローマ字：paeto-n kyoushuusen',
        '### なし',
    ]);
    // the English title goes under the romaji
    assert.deepEqual(resultToText(none, ['パエトーン強襲戦'], ['ZenZero Gyaku Ra Goudou "Phaethon Assault"']), [
        '# 検索結果',
        '## パエトーン強襲戦',
        'ローマ字：paeto-n kyoushuusen',
        '英語　　：ZenZero Gyaku Ra Goudou "Phaethon Assault"',
        '### なし',
    ]);
    // no English title: no line
    assert.deepEqual(resultToText(none, ['パエトーン強襲戦'], [null]).includes('英語　　：'), false);
    // the same text (case aside): nothing to add
    assert.deepEqual(resultToText({ 'comic exe 11': [] }, ['COMIC EXE 11']), ['# 検索結果', '## COMIC EXE 11', '### なし']);
    // no typed query: the heading is the query of the API
    assert.deepEqual(resultToText({ q: [] }), ['# 検索結果', '## q', '### なし']);
});

test('a magazine: the heading is its name, and the romaji line is only for a difference from what was asked', () => {
    const lines = (query: string, name: string, sent: string) => resultToText({ [query]: [] }, [name], null, [sent]);

    // the name has Japanese: what was asked differs from its romaji
    assert.deepEqual(lines('comic kairakuten 2026 11', 'COMIC快楽天 2026年11月号', 'COMIC快楽天 2026 11 '), [
        '# 検索結果',
        '## COMIC快楽天 2026年11月号',
        'ローマ字：comic kairakuten 2026 11',
        '### なし',
    ]);
    // a name in Latin letters: "年" and "月号" are only spaces, so the romaji is the same and has no line
    assert.deepEqual(lines('comic x-eros 2026 7', 'COMIC X-EROS 2026年7月号', 'COMIC X-EROS 2026 7 '), [
        '# 検索結果',
        '## COMIC X-EROS 2026年7月号',
        '### なし',
    ]);
});

test('a query in Latin letters (English or romaji) has no romaji line and no English line', () => {
    // romaji that was typed: the API's romaji only differs in letter case or punctuation
    assert.deepEqual(resultToText({ "siblings shouldn't do it": [] }, ["Siblings Shouldn't Do It!"], ['シブリング']), [
        '# 検索結果',
        "## Siblings Shouldn't Do It!",
        '### なし',
    ]);
    assert.deepEqual(resultToText({ 'kairakuten 2026': [] }, ['kairakuten  2026'], ['pleasure heaven']), [
        '# 検索結果',
        '## kairakuten  2026',
        '### なし',
    ]);
    // the Japanese title of a query in Latin letters
    assert.deepEqual(resultToText({ 'nine lives': [] }, ['Nine Lives'], [null], ['Nine Lives'], ['九つの命']), [
        '# 検索結果',
        '## Nine Lives',
        '日本語　：九つの命',
        '### なし',
    ]);
    // a Japanese query has no Japanese line
    assert.deepEqual(resultToText({ kairakuten: [] }, ['快楽天'], null, ['快楽天'], ['快楽天']), ['# 検索結果', '## 快楽天', 'ローマ字：kairakuten', '### なし']);
    // Japanese: both lines stay
    assert.deepEqual(resultToText({ kairakuten: [] }, ['快楽天'], ['pleasure heaven']), [
        '# 検索結果',
        '## 快楽天',
        'ローマ字：kairakuten',
        '英語　　：pleasure heaven',
        '### なし',
    ]);
});

test('splitTextWithin keeps at most the given number of messages and says how many links were left out', () => {
    const lines = ['# 検索結果', '## q', '### 合法：'];
    for (let i = 1; i <= 60; i++) lines.push(`${i}. ${'x'.repeat(95)}`);
    lines.push('### 違法：', `1. ${'y'.repeat(95)}`);

    assert.ok(splitText(lines).length > 2);
    const within = splitTextWithin(lines, 2);
    assert.equal(within.length, 2);
    assert.ok(within.every((m) => m.length <= 2000));
    const last = within[1].split('\n').at(-1)!;
    assert.match(last, /^…ほか \d+ 件は省略しました$/);
    const kept = within.join('\n').split('\n').filter((l) => /^\d+\. /.test(l)).length;
    assert.equal(kept + Number(last.match(/\d+/)![0]), 61, 'every link is either shown or counted');
    assert.ok(!within[1].split('\n').at(-2)!.startsWith('#'), 'no heading is left alone before the note');

    // what fits is not touched
    const small = ['# 検索結果', '## q', '1. a'];
    assert.deepEqual(splitTextWithin(small, 2), splitText(small));
});
