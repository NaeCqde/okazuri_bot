# okazuri-api

日本語をローマ字の読みに変換する API(FastAPI + cutlet + pykakasi)。`src/pronounce.ts` が呼びます。

- 基本はヘボン式ローマ字
- カタカナの外来語は、辞書(UniDic)にある元の綴りの英単語になる(`チートアイテム` → `cheat item`)
- もともと伸ばし棒「ー」だった長音は、母音を重ねずにハイフンで残す(`リカバリー` → `rikabari-`)

```
チートアイテム管理局のお仕事   -> cheat item kanri kyoku no oshigoto
ナカよしふらすとれーしょん！   -> naka yoshi furasutore-shon!
```

## 起動

```
cd api
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

ボット側は `OKAZURI_API_URL=http://127.0.0.1:8000`(`.dev.vars`)にします。
Python は 3.12 に固定しています(`.python-version`)。cutlet が使う fugashi のビルド済みパッケージが、新しすぎる Python にはないためです。

## エンドポイント

- `GET /pronounce?q=<日本語>` ... 小文字のローマ字を語ごとに空白で区切った `text/plain`
  - `engine=pykakasi` ... 外来語も読みのままのヘボン式(`チート` → `chiito`)。省略は `cutlet`
  - `loanwords=english` ... ひらがなで書かれた外来語も、辞書にあれば英単語にする
    (`ふらすとれーしょん` → `frustration`)。省略は `romaji`(`furasutore-shon`)
- `GET /health` ... `ok`

## 変換の仕組みと癖

- cutlet(MeCab + UniDic)で単語に分けて読む。MeCab は、ひらがなで書いた外来語を意味のない部分に
  切ることがあるので(`ふらす / とれ / ー / しょ / ん`)、`ー` や小さい仮名(`ふぁ`)を目印に
  1語につなげている(`Romanizer.kana_groups`)
- ひらがなを全部カタカナにしてから変換すると、外来語は英単語に戻るが、普通の日本語の切り方が
  壊れる(`寂しいうさちゃんは…` が全部つながる、漢字が残る)ので、外来語と見当がついた部分にだけ使う
- UniDic の外来語の綴りには、同音の別の外国語が入っているものがある(`ラーメン` → `Rahmen`、
  `メイド` → `made`)。見つけたら `main.py` の `EXCEPTIONS` に足す
- 人名などの珍しい漢字は読みを間違えることがある(UniDic に載っていない読み)
- 辞書にない仮名だけの語は崩れることがある
