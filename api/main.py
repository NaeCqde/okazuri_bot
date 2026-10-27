"""okazuri-bot の読み(ローマ字)変換 API。

src/pronounce.ts が GET /pronounce?q=<日本語> で呼ぶ。
日本語を、基本はヘボン式ローマ字に、カタカナの外来語は英単語にして返す。
海賊版サイトはタイトルをローマ字や英語で載せていることが多いので、検索語の書き換え
(src/rewriter.ts)で使う。
"""

import re
from typing import Literal

import cutlet
import jaconv
import pykakasi
from fastapi import FastAPI, Query
from cutlet.cutlet import has_foreign_lemma
from fastapi.responses import PlainTextResponse

app = FastAPI(title="okazuri-api")

# どちらも作るのが重いので、1回だけ作って使い回す
#
# cutlet: MeCab + UniDic で単語に分けて読む。UniDic にある外来語の元の綴りを使うので、
#         「チート」は cheat、「アイテム」は item になる。ASCII 以外(×、♯ など)は残す
# pykakasi: 辞書の読みをそのままヘボン式にする。外来語も読みのまま(cheeto -> chiito)
kakasi = pykakasi.kakasi()

HIRAGANA = re.compile(r"[ぁ-ゖ]+")
KANA = re.compile(r"[ぁ-ゖァ-ヺー]+")
SMALL_KANA = set("ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ")


# UniDic の外来語の綴りには、同音の別の外国語が入っていて誤るものがある
# (ラーメン -> Rahmen(ドイツ語の「枠」)、メイド -> made)。見つけたら、ここに足して直す
EXCEPTIONS = {
    "ラーメン": "ramen",
    "メイド": "maid",
}


def is_hiragana(word) -> bool:
    return bool(HIRAGANA.fullmatch(word.surface))


def is_ordinary_word(word) -> bool:
    """辞書にある普通の語(外来語の断片ではない)。小さい仮名を含む語は断片として扱う"""
    if word.is_unk or any(c in SMALL_KANA for c in word.surface):
        return False

    return word.feature.pos1 in ("名詞", "形容詞", "副詞", "連体詞", "接続詞", "代名詞") and (
        word.feature.pos2 != "数詞"
    )


class Romanizer(cutlet.Cutlet):
    """cutlet の単語ごとの空白を、仮名で綴った外来語に合うように直す。

    MeCab は「ふらすとれーしょん」のような、ひらがなで書いた外来語を
    「ふらす / とれ / ー / しょ / ん」と意味のない部分に切るので、そのままだと
    "furasutore- sho n" になる。長音「ー」を含むひらがなの語や、「ふぁ」のような
    小さい仮名を含む語を、1語につなげて "furasutore-shon" にする。

    english_loanwords が真のときは、つなげた部分をカタカナにして辞書を引き、
    外来語として載っていれば英単語にする("frustration")。載っていなければ上の形のまま。
    ひらがなを全部カタカナにすると普通の日本語の切り方が壊れるので、外来語と見当がついた
    部分(ひらがなの長音や小さい仮名を含む語)にだけ使う。
    """

    def __init__(self, *args, english_loanwords: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        self.english_loanwords = english_loanwords

        for surface, romaji in EXCEPTIONS.items():
            self.add_exception(surface, romaji)

    def loanword_in_english(self, kana: str) -> str | None:
        """ひらがなの語をカタカナにして、UniDic に外来語として載っていれば英単語を返す"""
        words = self.tagger(jaconv.hira2kata(kana))

        if words and all(has_foreign_lemma(w) for w in words):
            return " ".join(w.feature.lemma.split("-", 1)[-1] for w in words)

        return None

    def romaji_tokens(self, words, capitalize=True, title=False):
        tokens = super().romaji_tokens(words, capitalize, title)

        # 英単語に接尾辞が続くときは空白を入れる(maidsan -> maid san)。cutlet は接尾辞を前につなげる
        for i, token in enumerate(tokens[:-1]):
            if token.foreign and not token.space and words[i + 1].feature.pos1 == "接尾辞":
                token.space = True

        # 出力のトークンは、入力の単語と1対1で対応する(cutlet の仕様)
        groups = self.kana_groups(words)

        out = []
        i = 0
        while i < len(tokens):
            end = groups.get(i)

            if end is None:
                word = words[i]

                # もともと伸ばし棒「ー」だった長音は、母音を重ねずにハイフンで残す(rikabarii -> rikabari-)。
                # 外来語として英単語になる語や、母音で書かれた長音(ryokou の ou など)はそのまま
                if "ー" in word.surface and KANA.fullmatch(word.surface) and not has_foreign_lemma(word):
                    tokens[i].surface = "".join(
                        item["hepburn"] for item in kakasi.convert(word.surface.replace("ー", "-"))
                    )

                out.append(tokens[i])
                i += 1
                continue

            # つなげた部分は、仮名のままヘボン式にする(ー は - になる)。空白は最後の語のものを使う
            # 長音「ー」は、母音を重ねずにハイフンで残す(furasutore-shon)
            original = "".join(w.surface for w in words[i : end + 1])
            kana = original.replace("ー", "-")
            merged = tokens[end]
            merged.surface = (self.english_loanwords and self.loanword_in_english(original)) or "".join(
                item["hepburn"] for item in kakasi.convert(kana)
            )
            out.append(merged)
            i = end + 1

        return out

    def kana_groups(self, words) -> dict[int, int]:
        """1語につなげる範囲を {開始位置: 終了位置} で返す"""
        spans: list[tuple[int, int]] = []
        n = len(words)

        for i, word in enumerate(words):
            # ひらがなに続く長音: 「ふらすとれーしょん」
            if word.surface == "ー" and i > 0 and is_hiragana(words[i - 1]):
                start = i - 1
                # 辞書にある普通の語(「よし」など)の手前まで戻る
                while (
                    start > 0
                    and is_hiragana(words[start - 1])
                    and not is_ordinary_word(words[start - 1])
                ):
                    start -= 1

                end = i
                # 「しょ」「ん」のような語の終わりの断片を続ける。「の」「を」などの助詞は含めない
                while end + 1 < n and is_hiragana(words[end + 1]):
                    nxt = words[end + 1]
                    if nxt.feature.pos1 != "助詞" or nxt.surface == "ん":
                        end += 1
                    else:
                        break

                spans.append((start, end))

            # 小さい仮名が単独で切られた: 「ふ / ぁ / みこん」
            elif word.surface in SMALL_KANA and i > 0 and KANA.fullmatch(words[i - 1].surface):
                end = i
                if i + 1 < n and is_hiragana(words[i + 1]) and words[i + 1].feature.pos1 != "助詞":
                    end = i + 1

                spans.append((i - 1, end))

        # 重なった範囲はまとめる
        merged: dict[int, int] = {}
        for start, end in sorted(spans):
            last = next(iter(reversed(merged)), None)
            if last is not None and start <= merged[last]:
                merged[last] = max(merged[last], end)
            else:
                merged[start] = end

        return merged


romanizer = Romanizer(ensure_ascii=False)
romanizer_english = Romanizer(ensure_ascii=False, english_loanwords=True)


def with_pykakasi(text: str) -> str:
    return " ".join(item["hepburn"] for item in kakasi.convert(text))


def romanize(text: str, engine: str, loanwords: str = "romaji") -> str:
    if engine == "cutlet":
        try:
            target = romanizer_english if loanwords == "english" else romanizer
            romaji = target.romaji(text, capitalize=False)
        except Exception:
            # 変換できない入力でも、検索語を作れなくならないように pykakasi に任せる
            romaji = with_pykakasi(text)
    else:
        romaji = with_pykakasi(text)

    # 検索では大文字小文字を区別しない。固有名詞の頭文字の大文字や、連続した空白もそろえる
    return " ".join(romaji.lower().split())


@app.get("/pronounce", response_class=PlainTextResponse)
def pronounce(
    q: str = Query(..., min_length=1, max_length=300),
    engine: Literal["cutlet", "pykakasi"] = "cutlet",
    loanwords: Literal["romaji", "english"] = "romaji",
) -> str:
    """'チートアイテム管理局のお仕事' -> 'cheat item kanri kyoku no oshigoto'

    loanwords: ひらがなで書かれた外来語を、ローマ字("furasutore-shon")にするか、
    辞書にあれば英単語("frustration")にするか。カタカナの外来語は、どちらでも英単語になる
    """
    return romanize(q, engine, loanwords)


@app.get("/health", response_class=PlainTextResponse)
def health() -> str:
    return "ok"
