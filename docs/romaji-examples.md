# ローマ字化のずれの実例(okazuri-search-api の変換 と 実際の英語タイトル)

集め方: `search.db` の作品名(約4.4万件)のうち、日本語の題名 19,672 件を `okazuri-search-api convert` で変換し、
同じ作品の英語の題名(別のサイトの題名)を文字の類似で探した。似ている組 4,638 組のうち、完全に同じ 1,200 組を除く。
※ 類似での照合なので、別の号・別の話数の題名が混じることがある。各項目の差(語の違い)だけを見ること。

形式: 日本語 → 今の変換結果 / 英語側の実際の題名

## お手本(ご指定の2件)と今の変換

| | 日本語 | 今の変換 | 英語側(お手本) |
|---|---|---|---|
| 1 | `(C103) [ひつじだ (くまでら)] TS俺。彼女にた～っぷり愛される話♡` | `(c103) [hitsuji da (kuma dera)] ts ore. kanojo nita~ puri aisareru hanashi` | `(C103) [Hitsujida (Kumadela)] TS Ore. Kanojo ni Ta~ppuri Aisareru Hanashi` |
| 2 | `[達磨さん転んだ、チンジャオ娘。] 歪んだ三角の和を求めて` | `[darumasan koronda, chinjao musume.] yuganda sankaku no wa wo motomete` | `[Darumasan Koronda, Chinjao Girl.] Yuganda Sankaku no Wa o Motomete` |

違い: 1は「ひつじだ」「くまでら」という名前が辞書の語で切れる(`hitsuji da` `kuma dera`)/「にた～っぷり」で `っ` が消えて `ta~ puri` になる(英語側は `ni ta~ppuri`)。
2は を が `wo`(英語側は `o`)。`娘` が `girl` なのは訳なので、読みの変換では出せない。



## を → wo になる(英語側は o)

- `妹達のおっぱいを見て正気でいられる兄がいるわけないだろ！いいかげんにしろ！` (Nya:Hentai)
  - 変換: `imoutotachi no oppai wo mite shouki de irareru ani ga iru wake naidaro! ii kagen ni shiro!`
  - 英語: `Imoutotachi no Oppai o Mite Shouki de Irareru Ani ga Iru Wakenai Daro! Iikagen ni Shiro!` (RokuHentai)
- `自分にだけエロい顔を見せてくれる可愛い後輩` (同人の森)
  - 変換: `jibun ni dake eroi kao wo misete kureru kawaii kouhai`
  - 英語: `Jibun Ni Dake Eroi Kao O Misete Kureru Kawaii Kouhai` (Wnacg)
- `[羅莎莉亞漢化] [コトバアイ] ひとりキャンプをしていたら黒ギャルJKな妹と妹の友達が乱入してきた結果 後編 (コミックグレープ. Vol.95)` (RokuHentai)
  - 変換: `[ra 莎莉 akanka] [koto baai] hitori camp wo shite itara kuro gal jk na imouto to imouto no tomodachi g`
  - 英語: `[Kotoba Ai] Hitori Camp o Shite itara Kuro Gal JK na Imouto to Imouto no Tomodachi ga Rannyuu shite ` (RokuHentai)
- `人生を台無しにする4つの方法` (Nya:Hentai)
  - 変換: `jinsei wo dainashi ni suru 4tsu no houhou`
  - 英語: `Jinsei o Dainashi ni suru Yottsu no Houhou` (RokuHentai)
- `[はやけ] 妹達のおっぱいを見て正気でいられる兄がいるわけないだろ！いいかげんにしろ！ [DL版]` (Wnacg)
  - 変換: `[wa yake] imoutotachi no oppai wo mite shouki de irareru ani ga iru wake naidaro! ii kagen ni shiro!`
  - 英語: `Imoutotachi no Oppai o Mite Shouki de Irareru Ani ga Iru Wakenai Daro! Iikagen ni Shiro!` (RokuHentai)
- `腸の中のうんこを覗かれちゃう女の子たち2` (Nya:Hentai)
  - 変換: `chou no naka no unko wo nozokarechau onnanokotachi 2`
  - 英語: `[yudoufu] Chou no Naka no Unko o Nozokarechau Onnanokotachi 2` (HentaiEnvy)

## 語の切れ目が違う(スペースの有無)

- `元先輩がエロい格好でムラムラするので催眠使ってエロいことをする。` (同人の森)
  - 変換: `moto senpai ga eroi kakkou de muramura suru no de saimin tsukatte eroi koto wo suru.`
  - 英語: `Moto Senpai Ga Eroi Kakkou De Muramura Suru Node Saimin Tsukatte Eroi Koto O Suru.` (Wnacg)
- `[Sora Paprika] Zenkoutei Manko ~Kanojo no Zenkoutei Damedame Onee-chan no Zenkoutei Body n` (EHentai)
  - 変換: `[sora paprika] zenkoutei manko ~kanojo no zenkoutei damedame onee-chan no zenkoutei body ni amayakas`
  - 英語: `[Sora Paprika] Zenkoutei Manko ~Kanojo no Zenkoutei Damedame Onee-chan no Zenkoutei Body ni Amayakas` (EHentai)
- `小鳥遊ホシノ子作り漫画前編 (7)` (JComic)
  - 変換: `takanashi hoshi no kozukuri manga zenpen (7)`
  - 英語: `Takanashi Hoshino Kozukuri Manga Zenpen` (RokuHentai)
- `[おにぎりとおかず] ねえおばちゃんSEXってなに～？` (Wnacg)
  - 変換: `[onigiri to okazu] nee obachan sex tte nani~?`
  - 英語: `[Onigiri to Okazu] Nee Oba-chan SEX tte nani ~? 2` (HentaiEra)
- `[Napo] Koi no Gun Fight (COMIC ExE 54) [Chinese] [无毒汉化组] [Digital]` (AsmHentai)
  - 変換: `[napo] koi no gun fight (comic exe 54) [chinese] [无毒 汉化 组] [digital]`
  - 英語: `[Napo] Koi no Gunfight (COMIC ExE 53) [Chinese] [Digital]` (RokuHentai)
- `緑橋すみれ 只今うんこ我慢中` (Nya:Hentai)
  - 変換: `midori hashi sumire tadaima unko gamanchuu`
  - 英語: `Midoribashi Sumire Tadaima Unko Gaman-chuu` (RokuHentai)

## 長音の綴り(ou/uu と o/u/oh)

- `[桐生真澄] 俺の叔母さんは性欲旺盛なギャルママ (コミックグレープ Vol.76)` (RokuHentai)
  - 変換: `[kiryuu masumi] ore no obasan wa seiyoku ousei na gal mama (comic grape vol.76)`
  - 英語: `[Kiryu Masumi] Ore no Oba-san wa Seiyoku Ousei na Gal Mama (COMIC Grape Vol. 76)` (RokuHentai)
- `桐生真澄 幸せ人妻ネトリ計画 ～僕が寝取れば先生は幸せになれる～ comicグレープ Vol.73 中文翻譯` (AsmHentai)
  - 変換: `kiryuu masumi shiawase hitozuma ne tori keikaku~ boku ga netoreba sensei wa shiawase ni nareru~ comi`
  - 英語: `[Kiryu Masumi] Shiawase Hitozuma Neori Keikaku ~Boku ga Netoreba Sensei wa Shiawase ni Nareru~ (COMI` (EHentai)
- `[Hinahara Emi] Kokoro, Natsu, Hyoukai. (COMIC Kairakuten 2025-11) [Chinese] [摆烂吃瓜汉化组] [Dig` (RokuHentai)
  - 変換: `[hinahara emi] kokoro, natsu, hyoukai. (comic kairakuten 2025-11) [chinese] [摆烂 吃瓜 汉化 组] [digital]`
  - 英語: `[Hinahara Emi] Kokoro, Natsu, Hyokai. | 마음, 여름, 해빙. (COMIC Kairakuten 2025-11) [Korean] [팀 오바참치] [Di` (RokuHentai)
- `[Shirisensha] Neko Love Shinro Kibo! (COMIC ExE 33) [Chinese] [羅莎莉亞漢化] [Digital]` (AsmHentai)
  - 変換: `[shirisensha] neko love shinro kibo! (comic exe 33) [chinese] [ra 莎莉 akanka] [digital]`
  - 英語: `[Shirisensha] Neko Love Shinro Kibou! (COMIC ExE 33) [Spanish] [Digital]` (RokuHentai)

## カタカナ語・名前の綴りが違う(英語側が別の綴り)

- `(C46) [リボン結び (江崎なると)] おもちゃのCHA-CHA-CHA (赤ずきんチャチャ)` (Nya:Hentai)
  - 変換: `(c46) [ribbon musubi (ezaki naru to)] omocha no cha-cha-cha (aka zukin chacha)`
  - 英語: `(C46) [Ribon Musubi (Ezaki Naruto)] Omocha no CHA-CHA-CHA (Akazukin Chacha)` (AsmHentai)
- `[ちぃずオレ] 小鳥遊ホシノ子作り漫画前編 (ブルーアーカイブ) [欶澜汉化组]` (Wnacg)
  - 変換: `[chizu ore] takanashi hoshi no kozukuri manga zenpen (blue archive) [欶澜 汉化 组]`
  - 英語: `[Chiizu Ore] Takanashi Hoshino Kozukuri Manga Zenpen (Blue Archive)` (AsmHentai)
- `海賊瓶詰 Vol.2 ～真夏の夜の淫夢～` (DLsite)
  - 変換: `kaizoku binzume vol.2 ~ manatsu no yoru no inmu~`
  - 英語: `Kaizoku Binzume Vol.2 ~Minatsu no Yoru no Inmu~` (RokuHentai)
- `COMICエウロパ vol.1` (DLsite)
  - 変換: `comic europa vol.1`
  - 英語: `COMIC Europa Vol. 19` (RokuHentai)
- `COMIC オルガ vol.35` (RokuHentai)
  - 変換: `comic oruga vol.35`
  - 英語: `COMIC Orga Vol. 35` (RokuHentai)
- `COMICオルガ vol.60` (RokuHentai)
  - 変換: `comic oruga vol.60`
  - 英語: `COMIC Orga Vol. 60` (RokuHentai)

## ローマ字側にだけ余分な語がある

- `[Announ] Shunkashoutou Harem Tengoku! Ch. 13 Michibikareshi Chichi-tachi (COMIC Kuriberon ` (EHentai)
  - 変換: `[announ] shunkashoutou harem tengoku! ch. 13 michibikareshi chichi-tachi (comic kuriberon duma 2024-`
  - 英語: `[Announ] Shunkashoutou Harem Tengoku! Ch. 13 Michibikareshi Chichi-tachi (COMIC Kuriberon DUMA 2024-` (EHentai)
- `ノンケが連れ去られ男の子人生オワタ (65)` (JComic)
  - 変換: `nonke ga tsuresarare otokonoko jinsei owata (65)`
  - 英語: `Nonke ga Tsuresarare Otokonoko Jinsei Owata` (RokuHentai)
- `実の娘と近親相姦してしまう話 (193)` (JComic)
  - 変換: `jitsu no musume to kinshin soukan shite shimau hanashi (193)`
  - 英語: `Jitsu No Musume To Kinshin Soukan Shite Shimau Hanashi` (Wnacg)
- `[Emori Uki] Kanohaha Lesson (COMIC Kuriberon DUMA 2026-02 Vol.81) [Chinese] [廉价汉化组] [Digit` (RokuHentai)
  - 変換: `[emori uki] kanohaha lesson (comic kuriberon duma 2026-02 vol.81) [chinese] [ren 价汉ka 组] [digital]`
  - 英語: `[Emori Uki] Kanohaha Lesson (COMIC Kuriberon DUMA 2026-02 Vol.81) [Chinese] [Digital]` (RokuHentai)
- `[Eroi-Roe] Shakkin Jigoku to Hazuremono (COMIC Kairakuten 2023-12) [Chinese] [大鸟可不敢乱转汉化] [` (RokuHentai)
  - 変換: `[eroi-roe] shakkin jigoku to hazuremono (comic kairakuten 2023-12) [chinese] [oo鸟可 fu敢乱 转汉ka] [digit`
  - 英語: `[Eroi-Roe] Shakkin Jigoku to Hazuremono (COMIC Kairakuten 2023-12) [Chinese] [Digital]` (RokuHentai)
- `[Negurie] Karamitsuku Shisen 35 | 纠缠的视线35 (COMIC Kuriberon DUMA 2024-01 Vol. 56) [Chinese]` (EHentai)
  - 変換: `[negurie] karamitsuku shisen 35 | 纠缠teki 视线 35 (comic kuriberon duma 2024-01 vol. 56) [chinese]`
  - 英語: `[Negurie] Karamitsuku Shisen 35 (COMIC Kuriberon DUMA 2024-01 Vol. 56) [Chinese]` (RokuHentai)

## 1語の名前が細かく切れる

- `(C96) [妖精漫画社 (さかきいまさと)] 深夜泥酔単身赴任放置人妻蟻地獄` (Wnacg)
  - 変換: `(c96) [yousei manga sha (sakaki ima sato)] shin'ya deisui tanshin funin houchi hitozuma ari jigoku`
  - 英語: `(C96) [Youseimangasya (Sakaki Imasato)] Shinya Deisui Tanshin Funin Houchi Hitozuma Arijigoku` (HentaiEnvy)
- `[けものみち (くろれんにゅ～)] 小鳥遊ホシノが激エロコスプレ&厚底ハイヒール装備でケダモノ住人から援助を受ける本 (ブルーアーカイブ)` (Wnacg)
  - 変換: `[kemono michi (kuro ren nyu~)] takanashi hoshino ga geki erotic costume play& atsuzoko high heel sou`
  - 英語: `[Kemono Michi (Kurorennyuu)] Takanashi Hoshino ga Geki Ero Cosplay & Atsuzoko High Heel Soubi de Ked` (AsmHentai)
- `[Shigaoka Touki] JK Bitch Gyaru ga Enkou o Chichioya ni Okorareta node Kinshin Soukan Shit` (RokuHentai)
  - 変換: `[shigaoka touki] jk bitch gyaru ga enkou o chichioya ni okorareta node kinshin soukan shite yatta | `
  - 英語: `Shigaoka Touki] JK Bitch Gyaru ga Enkou o Chichioya ni Okorareta node Kinshin Soukan Shite yatta | A` (HentaiEnvy)
- `(C102) [けものみち (くろれんにゅ～)] 小鳥遊ホシノが激エロコスプレ&厚底ハイヒール装備でケダモノ住人から援助を受ける本 (ブルーアーカイブ) [DL版]` (Sukebei)
  - 変換: `(c102) [kemono michi (kuro ren nyu~)] takanashi hoshino ga geki erotic costume play& atsuzoko high h`
  - 英語: `[Kemono Michi (Kurorennyuu)] Takanashi Hoshino ga Geki Ero Cosplay & Atsuzoko High Heel Soubi de Ked` (AsmHentai)
- `[金たロウ] インセスト (COMIC Penguin Club Sanzokuban 2011-06).zip` (Sukebei)
  - 変換: `[kane ta rou] incest (comic penguin club sanzokuban 2011-06).zip`
  - 英語: `[Kintaro] Incest (COMIC Penguin Club Sanzokuban 2011-06)` (RokuHentai)
- `[あくまやさん (ど)] ノンケだったはずの女装コスプレイヤーが男性に誘われてオフパコする話。 [DL版]` (Wnacg)
  - 変換: `[akumayasan (do)] nonke datta hazu no josou costume play year ga dansei ni sasowarete off pako suru `
  - 英語: `[Akumaya-san (Do)] Nonke datta Hazu no Josou Cosplayer ga Dansei ni Sasowarete Off-Pako suru Hanashi` (HentaiEnvy)

## 英語側にだけある語(訳注・タグなど)

- `芳澤×鴨志田` (Nya:Hentai)
  - 変換: `yoshizawa kamoshida`
  - 英語: `Yoshizawa x Kamoshida` (RokuHentai)
- `ある日突然、妻と義母のカラダが入れ替わったらいろいろ近親相姦だった 7` (Nya:Hentai)
  - 変換: `aru hi totsuzen, tsuma to gibo no karada ga irekawattara iroiro kinshin soukan datta 7`
  - 英語: `[Fuuga] Aru Hi Totsuzen, Tsuma to Gibo no Karada ga Irekawattara Iroiro Kinshin Soukan datta 7` (HentaiEra)
- `[葦の性交は罪 (しかばねかも)] 叔母と甥 ～姉御肌の叔母とひと夏の近親相姦浮気セックス` (Wnacg)
  - 変換: `[ashi no seikou wa tsumi (shikabane ka mo)] oba to oi~ ane ohada no oba to hitonatsu no kinshin souk`
  - 英語: `[Ashi no Seikou wa Tsumi (shikabanekamo)] Oba to Oi ~Anegohada no Oba to Hito Natsu no Kinshin Souka` (HentaiEra)
- `[Akubine Kokoro] 『わたしの居場所は白い海』 COMIC Magnum Vol.189 [MTL] [Korean]` (HentaiEnvy)
  - 変換: `[akubine kokoro] "watashi no i basho wa shiroi umi" comic magnum vol.189 [mtl] [korean]`
  - 英語: `[Akubine Kokoro] Watashi no Ibasho wa Shiroi Umi (COMIC Magnum Vol.189) [Korean] [MTL]` (RokuHentai)
- `[黒木秀彦] 遭難して密着 (WEB版コミック激ヤバ! Vol.149)` (RokuHentai)
  - 変換: `[kuroki hidehiko] sounan shite mitchaku (web ban comic gekiyaba! vol.149)`
  - 英語: `[Kuroki Hidehiko] Sounan shite Mitchaku | 조난당해 밀착 (WEB Ban COMIC Gekiyaba! Vol. 149) [Korean]` (RokuHentai)
- `[Akubine Kokoro] 「朱に交じってしまえば」 COMIC Magnum Vol.196 [MTL] [Korean]` (HentaiEnvy)
  - 変換: `[akubine kokoro] "shu ni majitte shimaeba" comic magnum vol.196 [mtl] [korean]`
  - 英語: `[Akubine Kokoro] Shu ni Majitte Shimaeba (COMIC Magnum Vol.196) [Korean] [MTL]` (EHentai)

## 「年・月・号」が語になる(英語側は 2026-11 のような数字)

- `おしおきっ!三月精+1!` (DLsite)
  - 変換: `oshioki ! san gatsu sei+1!`
  - 英語: `Oshioki! Sangetsusei +1!` (RokuHentai)
- `[むこうじまてんろ] 相互嫉妬～澪と志郎～ (COMIC ペンギンクラブ 2012年05月号)` (Sukebei)
  - 変換: `[mu kou ji ma te n ro] sougo shitto~ mio to shirou~ (comic penguin club 2012 nen 05 gatsu gou)`
  - 英語: `[Mukoujima Tenro] Sougo Shitto ~Mio to Shirou~ (COMIC Penguin Club 2012-05)` (RokuHentai)
- `[櫻井エネルギー] 夏の香りがする (COMIC ペンギンクラブ 2011年10月号)` (Wnacg)
  - 変換: `[sakurai energy] natsu no kaori ga suru (comic penguin club 2011 nen 10 gatsu gou)`
  - 英語: `[Sakurai Energy] Natsu no Kaori ga Suru (COMIC Penguin Club 2011-10)` (RokuHentai)
- `[松河] ヤリチン友近君とおこぼれにあずかる僕 (COMIC 快楽天 2026年11月号) [不咕鸟汉化组] [DL版]` (Wnacg)
  - 変換: `[matsu kawa] yarichin tomochikakun to okobore ni azukaru boku (comic kairakuten 2026 nen 11 gatsu go`
  - 英語: `[Matsukawa] Yarichin Tomochikakunto Okoboreni azukaru boku | 바람둥이 토모치카 군과 낙수효과를 누리는 나 (COMIC Kairaku` (HentaiEnvy)
- `[束] 生徒会長、敗北。熟女の体臭に歪められた性癖 (COMIC クリベロン DUMA 2026年5月号 Vol.84) [ZZR个人汉化]` (Wnacg)
  - 変換: `[taba] seito kaichou, haiboku. jukujo no taishuu ni yugamerareta seiheki (comic kuriberon duma 2026 `
  - 英語: `[Taba] Seitokaichou, haiboku. Jukujo no Taishuu ni Yugamerareta Seiheki (COMIC Kuriberon DUMA 2026-0` (RokuHentai)
- `[浦辺克斗] 躾は××の後で (COMIC ペンギンクラブ山賊版 2012年01月号).zip` (Sukebei)
  - 変換: `[urabe katsu to] shitsuke wa no ato de (comic penguin club sanzoku ban 2012 nen 01 gatsu gou).zip`
  - 英語: `[Urabe Katsuto] Shitsuke wa XX no Ato de (COMIC Penguin Club Sanzokuban 2012-01)` (HentaiEnvy)

## [DL版] が dl ban になる(英語側は [Digital])

- `[おかずカンパニー (オカズゆういち)] 学園の用務員さん2 [DL版]` (Wnacg)
  - 変換: `[okazu company (okazu yuuichi)] gakuen no youmuinsan 2 [dl ban]`
  - 英語: `[Okazu Company (Okazu Yuuichi)] Gakuen no Youmuin-san 2 [Digital]` (HentaiEra)
- `[Nostalgic Color (春日いづれ)] ユメ先輩のふたなり薬治験 総集編 ～ホシノちゃんといっしょ！ぷれみあむ～(ブルーアーカイブ) [DL版]` (HentaiEnvy)
  - 変換: `[nostalgic color (kasuga izure)] yume senpai no futanariyaku chiken soushuu hen~ hoshinochan to issh`
  - 英語: `[Nostalgic Color (Kasuga Izure)] Yume Senpai no Futanari Kusuri Chiken Soushuuhen ~Hoshino-chan to I` (HentaiEra)
- `[ゼロ地点ポメラニアン (ぽめらっぷ)] 雇ったメイドのまんこが臭かったので色々お願いしたら交尾までやれた話 [中国翻訳] [DL版]` (Wnacg)
  - 変換: `[zero chiten pomeranian (po merap pu)] yatotta maid no manko ga kusakatta no de iroiro onegai shitar`
  - 英語: `[Zerochiten Pomeranian (Pomerappu)] Yatotta Maid no Manko ga Kusakatta node Iroiro Onegai shitara Ko` (HentaiEnvy)
- `[Nanao] 3 Piece ~Nursing~ (COMIC ExE 37) [Chinese] [DL版]` (AsmHentai)
  - 変換: `[nanao] 3 piece ~nursing~ (comic exe 37) [chinese] [dl ban]`
  - 英語: `[Nanao] 3 Piece ~Nursing~ (COMIC ExE 37) [Chinese] [Digital]` (RokuHentai)
- `[たかしな浅妃] お姉ちゃんの幸せ甘やかし計画 (COMIC ExE 33) [无毒汉化组] [DL版]` (Wnacg)
  - 変換: `[takashina asa hi] oanechan no shiawase amayakashi keikaku (comic exe 33) [无毒 汉化 组] [dl ban]`
  - 英語: `[Takashina Asahi] Onee-chan no Shiawase Amayakashi Keikaku (COMIC ExE 33) [Korean] [Digital]` (HentaiEnvy)
- `コミック刺激的 SQUIRT！！Vol.75 [DL版]` (Wnacg)
  - 変換: `comic shigekiteki squirt!!vol.75 [dl ban]`
  - 英語: `COMIC Shigekiteki SQUIRT!! Vol.74` (RokuHentai)

## [中国翻訳] が chuugoku hon yaku になる(英語側は [Chinese])

- `[HaRu] 巨乳お稲荷様と同棲性活 ～極上パイズリ&中出し三昧で昇天させられた僕は今日こそ反撃に出る～ (コミックグレープ Vol.26) [中国翻訳]` (RokuHentai)
  - 変換: `[haru] kyonyuu oinarisama to dousei seikatsu~ gokujou paizuri& naka dashi sama-dhi de shouten sasera`
  - 英語: `[HaRu] Kyonyuu Oinari-sama to Dousei Seikatsu ~Gokujou Paizuri & Nakadashi Zanmai de Shouten Saserar` (EHentai)
- `[伊達レン] 私のナカでイキなさい！ 童貞幽霊と一夜限りの昇天NTRセックス♥ (コミックマグナム Vol.181) [中国翻訳]` (RokuHentai)
  - 変換: `[date ren] watashi no naka de iki nasai! doutei yuurei to ichiya kagiri no shouten ntr sex (comic ma`
  - 英語: `[Date Ren] Watashi no Naka de Iki Nasai! Doutei Yuurei to Ichiya Kagiri no Shouten NTR Sex (COMIC Ma` (RokuHentai)
- `[でんきくらげ] 〜性教育NTR〜ギャル幼馴染彼女、先輩の濃厚性指導でまんこ脳に堕ちる [中国翻訳]` (Wnacg)
  - 変換: `[de n kikurage] sei kyouiku ntr gal osananajimi kanojo, senpai no noukousei shidou de manko nou ni o`
  - 英語: `[Denki Kurage] ~Seikyouiku NTR~ Gal Osananajimi Kanojo, Senpai no Noukou Seishidou de Manko Nou ni O` (HentaiEnvy)
- `[おにぎりとおかず (えちごおりまん)] SEXパーソナルトレーナーの無表情巨乳お姉さんに淡々と筆おろしてもらう話 [中国翻訳]` (Wnacg)
  - 変換: `[onigiri to okazu (echigo oriman)] sex personal trainer no muhyoujou kyonyuu oanesan ni tantan to fu`
  - 英語: `[Onigiri to Okazu (Echigooriman)] SEX Personal Trainer no Muhyoujou Kyonyuu Onee-san ni Tantan to Fu` (EHentai)
- `[伊達レン] ネトリ愛 - 巨乳JDと酔った勢いで一夜限りの濃厚NTRセックス (コミックマグナム Vol.161) [中国翻訳]` (RokuHentai)
  - 変換: `[date ren] netori ai - kyonyuu jd to yotta ikioi de ichiya kagiri no noukou ntr sex (comic magnum vo`
  - 英語: `[Date Ren] Netori Ai - Kyonyuu JD to Yotta Ikioi de Ichiya Kagiri no Noukou NTR Sex (COMIC Magnum Vo` (RokuHentai)
- `[ソーラーぱぷりか] 全肯定まんこ〜彼女の全肯定ダメダメお姉ちゃんの全肯定ボディに甘やかされてダメになってしまう話〜 [中国翻訳]` (Wnacg)
  - 変換: `[solar pa puri ka] zenkoutei manko kanojo no zenkoutei dame dame oanechan no zenkoutei body ni amaya`
  - 英語: `[Sora Paprika] Zenkoutei Manko ~Kanojo no Zenkoutei Damedame Onee-chan no Zenkoutei Body ni Amayakas` (EHentai)
