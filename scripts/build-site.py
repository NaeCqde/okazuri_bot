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
<p>{T('Discord で <code>/search</code> に探したい語を入れるだけです。雑誌の名前で探すときは <code>by_magazine</code>(雑誌で検索)をオンにします。', 'In Discord, type what you look for after <code>/search</code>. To look for a magazine by its name, turn <code>by_magazine</code> on.')}</p>
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
    docs += ep('GET', '/okazuri/search', T('各サイトの作品を検索します。クエリはまずローマ字にされ、題名のローマ字と全部の語が合うものを返します。日本語のクエリには英語訳(<code>translation</code>)、日本語を含まないクエリには日本語訳(<code>translation_ja</code>)の題名の作品も含まれます。各結果には <code>title_english</code>(英語のタイトル、<code>英語 | 日本語</code> の英語側、または保存済みの翻訳)は <code>{text, source}</code> の形で、<code>source</code> は <code>official</code>(作品自身のタイトル。Hitomi.La のものも)か <code>google</code>(機械翻訳)です。なければ <code>null</code> です。このリクエストのために翻訳はしません。', 'Searches the works of the sites. The query is turned into romaji first, and the works whose title has all its words are answered. A query in Japanese also finds the works of its English title (<code>translation</code>), a query without Japanese the works of its Japanese title (<code>translation_ja</code>). Each result has <code>title_english</code> (the title if it is English, the English side of an <code>English | 日本語</code> title, or a saved translation) is <code>{text, source}</code>, where <code>source</code> is <code>official</code> (the work\'s own title, Hitomi.La\'s too) or <code>google</code> (a machine translation); it is <code>null</code> when there is none. Nothing is translated for the request.'),
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
      "title_english": { "text": "COMIC Kairakuten 2026 November", "source": "google" } }
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
<form id="f"><div id="rows"></div><div class="sbox"><button type="button" class="btn" id="add">{T('+ 入力欄を足す', '+ Add a field')}</button><button class="btn primary">{T('検索', 'Search')}</button></div>
<label class="note"><input type="checkbox" id="bm"> {T('雑誌で検索(この作品が載っている号を探す)', 'By magazine (find the issue that printed this work)')}</label>
<div class="opts"><label>{T('グループ', 'Group')} <select id="grp"><option value="legal">{T('合法 / 違法', 'Legal / illegal')}</option><option value="site">{T('サイト', 'Site')}</option><option value="lang">{T('言語', 'Language')}</option><option value="none">{T('なし', 'None')}</option></select></label>
<label>{T('並び順', 'Sort')} <select id="srt"><option value="lang">{T('言語 → サイト → タイトル', 'Language → site → title')}</option><option value="site">{T('サイト → タイトル', 'Site → title')}</option><option value="title">{T('タイトル', 'Title')}</option></select></label></div></form>
<div id="out"></div></main>''' + foot
    tx = {'ja': dict(busy='検索しています…(初めての語は少し時間がかかります)', err='エラーです', net='通信に失敗しました。', otherlang='日本語・不明', loading='件を取得しています…', ph='例: 快楽天 2026 11', rm='消す', none='見つかりませんでした。', legal='合法', illegal='違法', romaji='ローマ字　', en='英語　　', ja='日本語　', count="n+' 件'", first="'(先頭の '+n+' 件)'"),
          'en': dict(busy='Searching… (a new word takes a little while)', err='Error', net='The request failed.', otherlang='Japanese / unknown', loading='works loaded…', ph='e.g. kairakuten 2026 11', rm='Remove', none='Nothing found.', legal='Legal', illegal='Illegal', romaji='Romaji　', en='English　', ja='Japanese ', count="n+' works'", first="' (first '+n+')'")}[lang]
    js = '''<script>
const $=s=>document.querySelector(s),out=$('#out'),rows=$('#rows');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function addRow(v){
  const d=document.createElement('div');d.className='sbox';
  d.innerHTML='<input placeholder="%(ph)s" autocomplete="off"><button type="button" class="btn" title="%(rm)s">×</button>';
  d.querySelector('input').value=v||'';
  d.querySelector('button').onclick=()=>{if(rows.children.length>1)d.remove();else d.querySelector('input').value=''};
  rows.append(d);return d;
}
$('#add').onclick=()=>addRow('').querySelector('input').focus();
const LANGS=['en','zh','ko','es','fr','de','ru','it','th','pt','id','pl','tr','vi','ar'],FLAGS=['🇺🇸','🇨🇳','🇰🇷','🇪🇸','🇫🇷','🇩🇪','🇷🇺','🇮🇹','🇹🇭','🇵🇹','🇮🇩','🇵🇱','🇹🇷','🇻🇳','🇸🇦'];
const LW=new Set('EN ENG JP JA JPN CN ZH TW KR KO ES SPA FR DE RU IT TH PT ID PL TR VN VI JAP RUS VIE ENGLISH JAPANESE CHINESE KOREAN SPANISH FRENCH GERMAN RUSSIAN ITALIAN THAI PORTUGUESE INDONESIAN POLISH TURKISH VIETNAMESE ARABIC SUB SUBS'.split(' '));
const CL=/^(中国翻訳|中国語|中文|简体中文|簡體中文|繁體中文|繁体中文|汉化|漢化)$/;
function clean(t){
  return t.trim().replace(/^(?:\p{Regional_Indicator}{2}\s*)+/u,'').replace(/\s*[\[(【]([^\[\]()【】]{1,40})[\])】]/g,(w,i)=>{
    const b=i.trim();if(CL.test(b))return '';
    const ws=b.toUpperCase().split(/[\s,/&+-]+/).filter(Boolean);return ws.length&&ws.every(x=>LW.has(x))?'':w}).replace(/\s+/g,' ').trim();
}
function codes(x){const c=[];for(const l of x.language||[]){const k=l.trim();if(LANGS.includes(k)&&!c.includes(k))c.push(k)}return c}
function rank(x){const c=codes(x).slice(0,2);return c.length===1?LANGS.indexOf(c[0])+1:0}
const col=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
const SORTS={
  lang:(a,b)=>a.r-b.r||col.compare(a.x.website,b.x.website)||col.compare(a.t,b.t)||a.i-b.i,
  site:(a,b)=>col.compare(a.x.website,b.x.website)||col.compare(a.t,b.t)||a.i-b.i,
  title:(a,b)=>col.compare(a.t,b.t)||a.i-b.i,};
function arrange(hits){
  const rows=hits.map((x,i)=>({x,i,r:rank(x),t:clean(x.title||'')}));
  rows.sort(SORTS[$('#srt').value]);
  const g=$('#grp').value,groups=new Map();
  for(const r of rows){
    let key,label,color='';
    if(g==='legal'){key=r.x.is_legal?'1':'0';label=r.x.is_legal?'%(legal)s':'%(illegal)s';color=r.x.is_legal?'var(--ok)':'var(--ng)'}
    else if(g==='site'){key=label=r.x.website}
    else if(g==='lang'){const c=codes(r.x);key=String(r.r);label=r.r?FLAGS[LANGS.indexOf(c[0])]+' '+c[0]:'%(otherlang)s'}
    else{key='';label=''}
    if(!groups.has(key))groups.set(key,{label,color,rows:[]});groups.get(key).rows.push(r);
  }
  let list=[...groups.entries()];
  if(g==='legal')list.sort((a,b)=>b[0]-a[0]);
  else if(g==='lang')list.sort((a,b)=>a[0]-b[0]);
  else if(g==='site')list.sort((a,b)=>col.compare(a[1].label,b[1].label));
  return list.map(e=>e[1]);
}
function items(rows){
  return '<div class="res">'+rows.map(({x,t})=>{const c=codes(x),f=c.length?FLAGS[LANGS.indexOf(c[0])]+' ':'';
    return '<div class="item"><small>'+esc(x.website)+'</small>'+f+'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(t||x.title||x.url)+'</a></div>'}).join('')+'</div>';
}
function show(st){
  const d=st.d;let h='<div class="lines">';
  if(st.ja&&d.query.replace(/\s+/g,' ')!==st.q.trim().toLowerCase())h+='<div>%(romaji)s<b>'+esc(d.query)+'</b></div>';
  if(d.translation?.text)h+='<div>%(en)s<b>'+esc(d.translation.text)+'</b></div>';
  if(d.translation_ja?.text)h+='<div>%(ja)s<b>'+esc(d.translation_ja.text)+'</b></div>';
  const n=d.total;
  h+='<div>'+(%(count)s)+(st.hits.length<d.total?(function(n){return %(first)s})(st.hits.length):'')+'</div></div>';
  for(const g of arrange(st.hits)){
    if(g.label)h+='<div class="group">'+(g.color?'<span class="dot" style="background:'+g.color+'"></span>':'')+esc(g.label)+' <small>'+g.rows.length+'</small></div>';
    h+=items(g.rows);
  }
  if(!st.hits.length)h+='<p class="note">%(none)s</p>';
  h+='<div class="sites">'+(d.sites||[]).map(s=>'<span class="chip'+(s.status==='failed'?' bad':'')+'">'+esc(s.website)+' '+esc(s.status)+'</span>').join('')+'</div>';
  return h;
}
let states=[];
function paint(){states.forEach((st,i)=>{const el=document.getElementById('res'+i);if(el&&st.d)el.innerHTML=show(st)})}
async function one(q,bm,i){
  const el=document.getElementById('res'+i);
  if(bm){
    const m=await fetch('/api/v1/okazuri/magazine?q='+encodeURIComponent(q)),md=await m.json();
    if(!m.ok){el.innerHTML='<p class="note">'+esc(md.detail||'%(err)s')+'</p>';return}
    q=md.results[0].issue.name.replace(/年|月号?/g,' ');
  }
  const st={q,ja:/[぀-ヿ㐀-鿿]/.test(q),hits:[],d:null};states[i]=st;
  // 1 回に取れるのは 100 件まで。全部取れるまで、offset をずらして繰り返す
  for(let offset=0;;offset+=100){
    const r=await fetch('/api/v1/okazuri/search?live=diff&limit=100&offset='+offset+'&q='+encodeURIComponent(q));
    const d=await r.json();
    if(!r.ok){el.innerHTML='<p class="note">'+esc(d.detail||'%(err)s')+'</p>';return}
    if(!st.d)st.d=d;else st.d.total=d.total;
    // offset を知らない古いサーバーは、同じ 100 件を返し続ける
    if(st.hits.length&&d.results.length&&st.hits[0].url===d.results[0].url)break;
    st.hits.push(...d.results);
    if(!d.results.length||st.hits.length>=d.total)break;
    el.innerHTML='<p class="note">'+st.hits.length+' / '+d.total+' %(loading)s</p>';
  }
  el.innerHTML=show(st);
}
async function run(){
  const qs=[...rows.querySelectorAll('input')].map(i=>i.value.trim()).filter(Boolean),bm=$('#bm').checked;
  if(!qs.length)return;
  history.replaceState(null,'','#'+qs.map(q=>'q='+encodeURIComponent(q)).join('&')+'&by_magazine='+bm);
  states=[];
  out.innerHTML=qs.map((q,i)=>'<section class="query">'+(qs.length>1?'<h2 class="sec">'+esc(q)+'</h2>':'')+'<div id="res'+i+'"><p class="note">%(busy)s</p></div></section>').join('');
  await Promise.all(qs.map((q,i)=>one(q,bm,i).catch(()=>{document.getElementById('res'+i).innerHTML='<p class="note">%(net)s</p>'})));
}
$('#grp').onchange=$('#srt').onchange=paint;
$('#f').addEventListener('submit',e=>{e.preventDefault();run()});
const hash=new URLSearchParams(location.hash.slice(1)),init=hash.getAll('q').filter(Boolean);
if(!init.length){const o=new URLSearchParams(location.search).get('q');if(o)init.push(o)}
if(hash.get('by_magazine')==='true')$('#bm').checked=true;
(init.length?init:['']).forEach(addRow);
if(init.length)run();
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
