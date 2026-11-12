import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeTitle, escapeUrl, languageFlags, resultLink, resultToText, splitText } from '../src/formatter';

const U = 'https://example.com/a';

test('escapes every Discord markdown character', () => {
    assert.equal(escapeTitle('*b* _i_ ~~s~~ ||sp|| `c`'), '\\*b\\* _i_ \\~\\~s\\~\\~ \\|\\|sp\\|\\| \\`c\\`');
    assert.equal(escapeTitle('a](https://evil.example)[b'), 'a\\]\\(https://evil.example)\\[b');
    assert.equal(escapeTitle('[Hamao] Fallin! [x [y]]'), '[Hamao] Fallin! [x [y]]');
    assert.equal(escapeTitle('[ Nuko.] Jujutsu 12 ](Jujutsu Kaisen)'), '[ Nuko.] Jujutsu 12 \\]\\(Jujutsu Kaisen)');
    assert.equal(escapeTitle('a [b'), 'a \\[b');
    assert.equal(escapeTitle(']a[b]['), '\\]a[b]\\[');
    assert.equal(escapeTitle('<@123> <@&1> <#2> <:e:3> @everyone'), '\\<\\@123\\> \\<\\@&1\\> \\<\\#2\\> \\<:e:3\\> \\@everyone');
    assert.equal(escapeTitle('# h > q - l'), '\\# h \\> q - l');
    assert.equal(escapeTitle('back\\slash \\* x'), 'back\\\\slash \\\\\\* x');
});

test('( ) and _ are left as they are, except ( right after ]', () => {
    assert.equal(escapeTitle('Hitsujida (Kumadera) snake_case_name'), 'Hitsujida (Kumadera) snake_case_name');
    assert.equal(escapeTitle('[x](https://evil.example)'), '[x]\\(https://evil.example)');
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

test('flags: Chinese', () => {
    assert.equal(languageFlags('[A] B [Chinese] [Digital]'), '🇨🇳');
    assert.equal(languageFlags('[A] B [chinese]'), '🇨🇳');
    assert.equal(languageFlags('[A] B [RanaMycin个人汉化] [DL版]'), '🇨🇳');
    assert.equal(languageFlags('[A] B [中国翻訳] [DL版]'), '🇨🇳');
    assert.equal(languageFlags('[A] B [無邪気漢化組]'), '🇨🇳');
    assert.equal(languageFlags('[A] 普通の日本語タイトル'), '');
});

test('flags: two-letter codes', () => {
    assert.equal(languageFlags('x [EN]'), '🇺🇸');
    assert.equal(languageFlags('x [en]'), '🇺🇸');
    assert.equal(languageFlags('x (JP)'), '');
    assert.equal(languageFlags('x 【KR】'), '🇰🇷');
    assert.equal(languageFlags('x [TH]'), '🇹🇭');
    assert.equal(languageFlags('x [English - EN] [Digital]'), '🇺🇸');
    assert.equal(languageFlags('x [CN,EN,JP,KR]'), '🇨🇳🇺🇸🇰🇷');
    assert.equal(languageFlags('x [jap / eng / rus]'), '🇺🇸🇷🇺');
});

test('flags: language names', () => {
    assert.equal(languageFlags('x [English] [Digital]'), '🇺🇸');
    assert.equal(languageFlags('x [korean]'), '🇰🇷');
    assert.equal(languageFlags('x (Spanish)'), '🇪🇸');
    assert.equal(languageFlags('x [RUSSIAN]'), '🇷🇺');
    assert.equal(languageFlags('x [French][Italian]'), '🇫🇷🇮🇹');
    assert.equal(languageFlags('x [Japanese]'), '');
    assert.equal(languageFlags('x [Chinese]'), '🇨🇳');
    assert.equal(languageFlags('x [English Edition Deluxe]'), '');
});

test('flags: no false positives', () => {
    for (const t of ['x [HD]', 'x [NR]', 'x [UC]', 'x [AI]', 'x [VR]', 'x [KS]', 'x [It Girl]', 'x [ID Card]', 'x (mr)', 'x EN']) {
        assert.equal(languageFlags(t), '', t);
    }
});

test('flags: no duplicate flag when the site already put one first', () => {
    assert.equal(languageFlags('🇨🇳 [Hamao] Fallin\' [Chinese]'), '🇨🇳');
    assert.equal(resultLink({ title: '🇨🇳 [A] b [Chinese]', url: U }), `[🇨🇳 [A] b](<${U}>)`);
});

test('link format: flag goes inside the brackets, language brackets are removed', () => {
    assert.equal(resultLink({ title: '[Hamao] Fallin\' [Chinese]', url: U }), `[🇨🇳 [Hamao] Fallin'](<${U}>)`);
    assert.equal(resultLink({ title: 'A (COMIC X 1) [English] [Digital]', url: U }), `[🇺🇸 A (COMIC X 1) [Digital]](<${U}>)`);
    assert.equal(resultLink({ title: 'A [中国翻訳] [DL版]', url: U }), `[🇨🇳 A [DL版]](<${U}>)`);
    assert.equal(resultLink({ title: 'A [山嵐个人汉化]', url: U }), `[🇨🇳 A [山嵐个人汉化]](<${U}>)`);
    assert.equal(resultLink({ title: '🇯🇵 A [EN]', url: U }), `[🇺🇸 A](<${U}>)`);
    assert.equal(resultLink({ title: '🇯🇵 A [JP]', url: U }), `[A](<${U}>)`);
    assert.equal(resultLink({ title: '[English]', url: U }), U);
    assert.equal(resultLink({ title: 'A [HD] [It Girl]', url: U }), `[A [HD] [It Girl]](<${U}>)`);
    assert.equal(resultLink({ title: 'plain', url: U }), `[plain](<${U}>)`);
});

test('resultToText numbers links and keeps every line short', () => {
    const lines = resultToText({
        q: [
            { title: 'a_b', website: 'w', url: U, isLegal: true },
            { title: 'x'.repeat(5000), website: 'w', url: U, isLegal: false },
        ],
    });
    assert.deepEqual(lines.slice(0, 4), ['# 検索結果', '## q', '### 合法：', `1. [a_b](<${U}>)`]);
    assert.ok(lines.every((l) => l.length < 400));
    assert.ok(splitText(lines).every((m) => m.length <= 2000));
});
