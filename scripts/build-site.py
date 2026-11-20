#!/usr/bin/env python3
"""Builds site/ (static pages): English at the root (/, /search, /dev) and Japanese under /ja (/ja, /ja/search, /ja/dev).
Run from the repository root: python3 scripts/build-site.py"""
import os, shutil

LANGS = ['ja', 'en']
OTHER = {'ja': 'en', 'en': 'ja'}
NAME = {'ja': '日本語', 'en': 'English'}


def build(lang: str):
    base = '/ja' if lang == 'ja' else ''  # the path of the language's pages
    other = '' if lang == 'ja' else '/ja'
    def T(ja, en):
        return ja if lang == 'ja' else en

    def nav(active, rest):
        return f'''<header class="nav"><div class="nav-in"><a class="brand" href="{base or '/'}">オカズリBOT</a>
<a class="link{' active' if active == 'search' else ''}" href="{base}/search">{T('検索', 'Search')}</a><a class="link{' active' if active == 'dev' else ''}" href="{base}/dev">API</a><span class="sp"></span>
<a class="lang" href="{(other + rest) or '/'}" hreflang="{OTHER[lang]}">{NAME[OTHER[lang]]}</a>
<a class="btn primary" href="/bot/add">{T('追加', 'Add')}</a></div></header>'''

    foot = f'<footer>オカズリBOT ・ <a href="/support/invite">{T("サポートサーバー", "Support server")}</a> ・ <a href="{base}/dev">API</a></footer>'

    def page(title, desc, rest, body, extra=''):
        return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}"><meta name="color-scheme" content="dark">
<link rel="alternate" hreflang="ja" href="/ja{rest}"><link rel="alternate" hreflang="en" href="{rest or '/'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css"></head><body>{body}{extra}</body></html>'''

    out = {}

    out['index.html'] = page('オカズリBOT', T('Discord で複数サイトの作品をまとめて検索する BOT', 'A Discord bot that searches many sites at once'), '', nav('', '') + f'''<main><section class="hero"><h1>{T('探したい作品を、<br><span>全部まとめて</span>検索', 'Search many sites<br><span>all at once</span>')}</h1>
<p>{T('日本語、ローマ字、英語のどれで聞いても、複数のサイトの作品を一度に探して返します。雑誌の最新号チェックにも使えます。', 'Ask in Japanese, romaji or English: it looks the works up on several sites at once. It also keeps track of the latest issues of magazines.')}</p>
<div class="cta"><a class="btn primary" href="/bot/add">{T('Discord に追加', 'Add to Discord')}</a><a class="btn" href="/support/invite">{T('サポートサーバーに参加', 'Join the support server')}</a><a class="btn" href="{base}/search">{T('ブラウザで検索', 'Search in the browser')}</a></div></section>
<div class="grid">
<div class="card"><h3>{T('複数サイトを一度に', 'Many sites at once')}</h3><p>{T('DLsite などの合法サイトと、そのほかのサイトの結果を、合法・違法に分けて並べます。', 'The results of legal sites such as DLsite and of other sites, sorted into legal and illegal.')}</p></div>
<div class="card"><h3>{T('日本語・ローマ字・英語', 'Japanese, romaji, English')}</h3><p>{T('日本語の題名はローマ字と英語に、英語の語は日本語の題名にも当たって、取りこぼしを減らします。', 'A Japanese title is also searched in romaji and English, and an English one in its Japanese title, so fewer works are missed.')}</p></div>
<div class="card"><h3>{T('雑誌のチェック', 'Magazines')}</h3><p>{T('COMIC快楽天など、DLsite のレーベルの最新号を毎日取り込んで、検索で見つけられます。', 'The latest issues of DLsite labels such as COMIC Kairakuten are fetched every day and can be found by search.')}</p></div>
<div class="card"><h3>{T('公開 API', 'Public API')}</h3><p>{T('同じ検索を、誰でも使える HTTP API として公開しています。', 'The same search is a public HTTP API that anyone can use.')} <a href="{base}/dev">{T('ドキュメント', 'Documentation')}</a></p></div></div>
<h2 class="sec">{T('使いかた', 'How to use')}</h2>
<p>{T('Discord で <code>/search</code> に探したい語を入れるだけです。雑誌の名前で探すときは <code>to_magazine</code> をオンにします。', 'In Discord, type what you look for after <code>/search</code>. To look for a magazine by its name, turn <code>to_magazine</code> on.')}</p>
<p class="note">{T('あなたが違法行為に関与した場合、運営は一切の責任を負いません。BOT を使うことで、この条件に同意したことになります。', 'If you take part in anything illegal, the operator is not responsible in any way. By using the bot you agree to this.')}</p></main>''' + foot)

    def tryit(path, fields):
        """A form that sends the request: one input per query parameter (a name, a kind, a default or the options)."""
        rows = []
        for name, kind, value in fields:
            if kind == 'select':
                options = ''.join(f'<option value="{o}">{o or T("(既定)", "(default)")}</option>' for o in value)
                control = f'<select name="{name}">{options}</select>'
            else:
                control = f'<input name="{name}" type="{kind}" value="{value}" autocomplete="off" spellcheck="false">'
            rows.append(f'<label><span>{name}</span>{control}</label>')
        return f'''<form class="try" data-path="{path}"><div class="try-title">{T("試す", "Try it")}</div><div class="try-fields">{''.join(rows)}</div>
<div class="try-bar"><button class="btn primary" type="submit">{T("送信", "Send")}</button><code class="try-url"></code></div><pre class="try-out" hidden></pre></form>'''

    def ep(m, path, desc, params, example, fields=()):
        rows = ''.join(f'<tr><td><code>{k}</code></td><td>{v}</td></tr>' for k, v in params)
        t = f'<table><tr><th>{T("パラメータ", "Parameter")}</th><th></th></tr>{rows}</table>' if params else ''
        return f'''<h2 id="{path.strip('/').replace('/', '-')}"><span class="method">{m}</span><code>/api/v1{path}</code></h2><p>{desc}</p>{t}<pre><code>{example}</code></pre>{tryit(path, fields)}'''

    docs = nav('dev', '/dev') + f'''<main><div class="docs"><nav class="side"><b>API</b><a href="#start">{T('はじめに', 'Start')}</a><a href="#okazuri-search">{T('検索', 'Search')}</a><a href="#okazuri-sites">{T('サイト一覧', 'Sites')}</a><a href="#translate">{T('翻訳', 'Translate')}</a><a href="#romaji">{T('ローマ字', 'Romaji')}</a><a href="#cache">{T('キャッシュ', 'Cache')}</a></nav>
<article><h1>{T('API ドキュメント', 'API documentation')}</h1><p class="note">{T('okazuri-search-api の公開サーバーです。認証は要りません。', 'The public server of okazuri-search-api. No authentication.')}</p>
<h2 id="start">{T('はじめに', 'Start')}</h2><p>{T('ベース URL は <code>https://okazuri.nae.quest/api/v1</code>。すべて <code>GET</code> で、JSON(<code>/romaji</code> と <code>/health</code> はテキスト)を返します。不正なリクエストは <code>422</code> と <code>{"detail": "..."}</code> です。', 'The base URL is <code>https://okazuri.nae.quest/api/v1</code>. Everything is a <code>GET</code> and answers JSON (<code>/romaji</code> and <code>/health</code> answer text). A bad request is a <code>422</code> with <code>{"detail": "..."}</code>.')}</p>
<pre><code>curl "https://okazuri.nae.quest/api/v1/okazuri/search?q=快楽天+2026+11"</code></pre>'''
    docs += ep('GET', '/okazuri/search', T('各サイトの作品を検索します。クエリはまずローマ字にされ、題名のローマ字と全部の語が合うものを返します。日本語のクエリには英語訳(<code>translation</code>)、日本語を含まないクエリには日本語訳(<code>translation_ja</code>)の題名の作品も含まれます。各結果には <code>title_english</code>(英語のタイトル、<code>英語 | 日本語</code> の英語側、または保存済みの翻訳)と <code>title_english_source</code>(<code>official</code>: 作品自身のタイトル(Hitomi.La のものも)、<code>google</code>: 機械翻訳)が付きます。なければどちらも <code>null</code> です。このリクエストのために翻訳はしません。', 'Searches the works of the sites. The query is turned into romaji first, and the works whose title has all its words are answered. A query in Japanese also finds the works of its English title (<code>translation</code>), a query without Japanese the works of its Japanese title (<code>translation_ja</code>). Each result has <code>title_english</code> (the title if it is English, the English side of an <code>English | 日本語</code> title, or a saved translation) and <code>title_english_source</code>: <code>official</code> (the work\'s own title, Hitomi.La\'s too) or <code>google</code> (a machine translation); both are <code>null</code> when there is none. Nothing is translated for the request.'),
        [('q', T('検索語。必須、1〜300 文字。空白で語を分けます。', 'The words. Required, 1 to 300 characters. White space separates them.')),
         ('live', T('<code>off</code>: DB だけで答える。<code>diff</code>(既定): 未取得か古い組み合わせだけサイトに聞く。<code>on</code>: 全サイトに聞く。', '<code>off</code>: answer from the database only. <code>diff</code> (default): ask only the combinations that are missing or old. <code>on</code>: ask every site.')),
         ('limit', T('結果の最大数(1〜100)。', 'The most results (1 to 100).')),
         ('exclude', T('除くサイトの名前(カンマ区切り)。', 'Sites to leave out, by name, separated by commas.')),
         ('translator', T('<code>auto</code>(既定) / <code>hitomi</code> / <code>google</code> / <code>none</code>。翻訳の題名でも探すか、どこで訳すか。', '<code>auto</code> (default), <code>hitomi</code>, <code>google</code> or <code>none</code>: whether the translated title is searched too, and where it is translated.'))],
        '''GET /api/v1/okazuri/search?q=快楽天+2026+7
{
  "input": "快楽天 2026 7",
  "query": "kairakuten 2026 7",
  "total": 12,
  "results": [
    { "website": "DLsite", "is_legal": true, "url": "https://www.dlsite.com/...",
      "title": "COMIC快楽天 2026年11月号", "title_romaji": "comic kairakuten 2026 nen 11 gatsu gou",
      "title_english": "COMIC Kairakuten 2026 November", "title_english_source": "google" }
  ],
  "translation": { "text": "COMIC Kairakuten", "source": "Hitomi" },
  "sites": [ { "website": "DLsite", "status": "searched", "count": 30 } ]
}''', fields=[('q', 'text', '快楽天 2026 11'), ('live', 'select', ['', 'diff', 'off', 'on']), ('limit', 'number', '10'), ('exclude', 'text', ''), ('translator', 'select', ['', 'auto', 'hitomi', 'google', 'none'])])
    docs += ep('GET', '/okazuri/sites', T('検索の対象のサイトと、いま検索しているかを返します。', 'The sites that can be searched, and whether each is searched now.'), [], 'GET /api/v1/okazuri/sites\n[ { "name": "DLsite", "is_legal": true, "support": "ready", "hasSearch": true, "japanese": true, "active": true } ]', fields=[])
    docs += f'''<h2 id="translate"><span class="method">GET</span><code>/api/v1/{{hitomila,google,auto}}/translate</code></h2><p>{T('題名の翻訳です。日本語の語は英語に、英語の語は日本語に訳します。<code>auto</code> は Hitomi.La、だめなら Google 翻訳。', 'Translates a title: Japanese into English, English into Japanese. <code>auto</code> uses Hitomi.La, and Google Translate if that fails.')}</p>
<table><tr><th>{T('パラメータ', 'Parameter')}</th><th></th></tr><tr><td><code>q</code></td><td>{T('翻訳する語。必須。', 'The text. Required.')}</td></tr><tr><td><code>live</code></td><td><code>off</code> / <code>diff</code> ({T('既定', 'default')}) / <code>force</code>.</td></tr></table>
<pre><code>GET /api/v1/auto/translate?q=姉弟</code></pre>''' + tryit('/{engine}/translate', [('engine', 'select', ['auto', 'hitomila', 'google']), ('q', 'text', '姉弟'), ('live', 'select', ['', 'diff', 'off', 'force'])])
    docs += ep('GET', '/romaji', T('日本語のローマ字を <code>text/plain</code> で返します。', 'The romaji of a Japanese text, as <code>text/plain</code>.'), [('q', T('テキスト。必須。', 'The text. Required.')), ('loanwords', T('<code>romaji</code>(既定) / <code>english</code>: ひらがなの外来語の書き方。', '<code>romaji</code> (default) or <code>english</code>: how a loanword spelled in hiragana is written.'))], 'GET /api/v1/romaji?q=チートアイテム管理局のお仕事\nchiito aitemu kanrikyoku no oshigoto', fields=[('q', 'text', 'チートアイテム管理局のお仕事'), ('loanwords', 'select', ['', 'romaji', 'english'])])
    docs += f'''<h2 id="cache">{T('キャッシュ', 'Cache')}</h2><p>{T('Cloudflare が成功(<code>200</code>)の応答を保持します。検索は 5 分、サイト一覧は 1 時間、翻訳とローマ字は 1 日です。<code>live=on</code>、エラー、<code>/health</code> は保持されません。応答の <code>Cache-Control</code> と <code>cf-cache-status</code> で確認できます。', 'Cloudflare keeps the successful (<code>200</code>) answers: 5 minutes for a search, an hour for the sites, a day for translations and romaji. <code>live=on</code>, errors and <code>/health</code> are not kept. See <code>Cache-Control</code> and <code>cf-cache-status</code> in the answer.')}</p>
<p class="note">{T('正確な仕様は', 'The exact specification is')} <a href="https://github.com/NaeCqde/okazuri-search-api/blob/main/docs/API.md">API.md (GitHub)</a>.</p></article></div></main>''' + foot
    try_js = '''<script>
document.querySelectorAll('form.try').forEach(form=>{
  const out=form.querySelector('.try-out'),show=form.querySelector('.try-url');
  const build=()=>{
    const q=new URLSearchParams();let path=form.dataset.path;
    for(const el of form.querySelectorAll('[name]')){
      if(el.name==='engine'){path=path.replace('{engine}',el.value);continue}
      if(el.value.trim()!=='')q.set(el.name,el.value.trim());
    }
    const query=q.toString();return '/api/v1'+path+(query?'?'+query:'');
  };
  const update=()=>{show.textContent='GET '+build()};
  form.addEventListener('input',update);update();
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const url=build(),start=performance.now();
    out.hidden=false;out.textContent='...';
    try{
      const r=await fetch(url);
      const ms=Math.round(performance.now()-start);
      const text=await r.text();
      let body=text;
      try{body=JSON.stringify(JSON.parse(text),null,2)}catch(_){}
      if(body.length>30000)body=body.slice(0,30000)+'\\n... ('+(body.length-30000)+')';
      const heads=['cache-control','cf-cache-status','age'].map(h=>r.headers.get(h)?h+': '+r.headers.get(h):'').filter(Boolean).join('\\n');
      out.textContent=r.status+' '+r.statusText+' ('+ms+' ms)\\n'+heads+'\\n\\n'+body;
    }catch(err){out.textContent=String(err)}
  });
});
</script>'''
    out['dev/index.html'] = page('API | オカズリBOT', T('okazuri-search-api の公開 HTTP API', 'The public HTTP API of okazuri-search-api'), '/dev', docs, try_js)

    search = nav('search', '/search') + f'''<main><h1 style="margin-top:48px;font-size:32px">{T('検索', 'Search')}</h1><p class="note">{T('日本語、ローマ字、英語で探せます。複数の語は空白で区切ります。', 'Search in Japanese, romaji or English. Separate several words with spaces.')}</p>
<form class="sbox" id="f"><input id="q" placeholder="{T('例: 快楽天 2026 11', 'e.g. kairakuten 2026 11')}" autocomplete="off" autofocus><button class="btn primary">{T('検索', 'Search')}</button></form>
<div id="out"></div></main>''' + foot
    tx = {'ja': dict(busy='検索しています…(初めての語は少し時間がかかります)', err='エラーです', net='通信に失敗しました。', none='見つかりませんでした。', legal='合法', illegal='違法', romaji='ローマ字　', en='英語　　', ja='日本語　', count="n+' 件'", first="'(先頭の '+n+' 件)'"),
          'en': dict(busy='Searching… (a new word takes a little while)', err='Error', net='The request failed.', none='Nothing found.', legal='Legal', illegal='Illegal', romaji='Romaji　', en='English　', ja='Japanese ', count="n+' works'", first="' (first '+n+')'")}[lang]
    js = '''<script>
const $=s=>document.querySelector(s),out=$('#out');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function run(q){
  if(!q.trim())return;
  history.replaceState(null,'','?q='+encodeURIComponent(q));
  out.innerHTML='<p class="note">%(busy)s</p>';
  try{
    const r=await fetch('/api/v1/okazuri/search?live=diff&q='+encodeURIComponent(q));
    const d=await r.json();
    if(!r.ok){out.innerHTML='<p class="note">'+esc(d.detail||'%(err)s')+'</p>';return}
    const ja=/[\\u3040-\\u30ff\\u3400-\\u9fff]/.test(q);
    let h='<div class="lines">';
    if(ja&&d.query.replace(/\\s+/g,' ')!==q.trim().toLowerCase())h+='<div>%(romaji)s<b>'+esc(d.query)+'</b></div>';
    if(d.translation?.text)h+='<div>%(en)s<b>'+esc(d.translation.text)+'</b></div>';
    if(d.translation_ja?.text)h+='<div>%(ja)s<b>'+esc(d.translation_ja.text)+'</b></div>';
    const n=d.total;
    h+='<div>'+(%(count)s)+(d.total>d.results.length?(function(n){return %(first)s})(d.results.length):'')+'</div></div>';
    for(const [legal,label,color] of [[true,'%(legal)s','var(--ok)'],[false,'%(illegal)s','var(--ng)']]){
      const rs=d.results.filter(x=>x.is_legal===legal);
      if(!rs.length)continue;
      h+='<div class="group"><span class="dot" style="background:'+color+'"></span>'+label+'</div><div class="res">'+rs.map(x=>'<div class="item"><small>'+esc(x.website)+'</small><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title)+'</a></div>').join('')+'</div>';
    }
    if(!d.results.length)h+='<p class="note">%(none)s</p>';
    h+='<div class="sites">'+(d.sites||[]).map(s=>'<span class="chip'+(s.status==='failed'?' bad':'')+'">'+esc(s.website)+' '+esc(s.status)+'</span>').join('')+'</div>';
    out.innerHTML=h;
  }catch(e){out.innerHTML='<p class="note">%(net)s</p>'}
}
$('#f').addEventListener('submit',e=>{e.preventDefault();run($('#q').value)});
const init=new URLSearchParams(location.search).get('q');if(init){$('#q').value=init;run(init)}
</script>''' % tx
    out['search/index.html'] = page(T('検索 | オカズリBOT', 'Search | Okazuri BOT'), T('複数のサイトの作品をまとめて検索', 'Search the works of many sites at once'), '/search', search, js)
    return out


root = os.path.join(os.path.dirname(__file__), '..', 'site')
shutil.rmtree(os.path.join(root, 'en'), ignore_errors=True)
for lang in LANGS:
    for name, html in build(lang).items():
        path = os.path.join(root, 'ja' if lang == 'ja' else '', name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w').write(html)

open(os.path.join(root, '404.html'), 'w').write('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 | Okazuri BOT</title><meta name="color-scheme" content="dark"><link rel="stylesheet" href="/style.css"></head>
<body><main><section class="hero"><h1>404</h1><p>Not found / 見つかりません</p><div class="cta"><a class="btn primary" href="/">English</a><a class="btn primary" href="/ja">日本語</a></div></section></main></body></html>''')
