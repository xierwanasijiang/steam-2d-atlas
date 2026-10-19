(()=>{
'use strict';
const $=id=>document.getElementById(id), data=window.ATLAS;
if(!data){$('games').innerHTML='<div class="empty"><h3>图鉴数据没有加载成功</h3><p>请刷新页面；本地版本请保持 data.js 与 HTML 在同一文件夹。</p></div>';return;}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>/^https:\/\//i.test(s||'')?escape(s):'#';
const fmt=n=>Number(n).toLocaleString('en-US');
const filterKeys=['q','category','subgenre','structure','style','tier','minRate','sort'];
const defaults={q:'',category:'',subgenre:'',structure:'',style:'',tier:'main',minRate:'90',sort:'curated',favoritesOnly:false};
let state={...defaults},limit=12,view='exhibition',favorites=new Set(),lightGame=null,lightIndex=0,toastTimer;
try{const saved=JSON.parse(localStorage.getItem('two-d-atlas-favorites')||'[]');if(Array.isArray(saved))favorites=new Set(saved.filter(Number.isInteger));view=localStorage.getItem('two-d-atlas-view')==='compact'?'compact':'exhibition';}catch{}
try{const params=new URLSearchParams(location.search);for(const k of filterKeys)if(params.has(k))state[k]=params.get(k);if(!['main','discovery','all'].includes(state.tier))state.tier='main';if(!data.categories.includes(state.category)){const legacy=data.legacyCategoryMap?.[state.category];if(legacy)Object.assign(state,legacy);else state.category='';}}catch{}
const taxonomy=data.taxonomy||[],subgenreParent=new Map(taxonomy.flatMap(t=>t.subgenres.map(s=>[s,t.name])));
if(!subgenreParent.has(state.subgenre))state.subgenre='';
if(state.category&&state.subgenre&&subgenreParent.get(state.subgenre)!==state.category)state.subgenre='';
if(!data.games.some(g=>g.structure===state.structure))state.structure='';
if(!data.games.some(g=>g.style===state.style))state.style='';
if(!['90','95','98'].includes(state.minRate))state.minRate='90';
if(!['curated','rating','reviews','name'].includes(state.sort))state.sort='curated';
const gamesById=new Map(data.games.map(g=>[g.id,g]));
const main=data.games.filter(g=>g.tier==='main');
const snapshotRange=data.snapshotStartDate&&data.snapshotStartDate!==data.snapshotDate?`${data.snapshotStartDate} 至 ${data.snapshotDate}`:data.snapshotDate;
$('main-count').textContent=main.length;
$('category-count').textContent=new Set(main.flatMap(g=>g.categories)).size;
$('snapshot-label').textContent=`采集日期 ${snapshotRange} · ${data.candidateCount} 款候选复核 · 小众发现 ${data.games.length-main.length} 款`;
const cover=data.games.find(g=>g.id===683320)||data.games[0];
if(cover){const image=new Image();image.src=cover.screenshots[0].full;image.alt=cover.name+' 官方商店截图';image.fetchPriority='high';$('hero-art').prepend(image);$('hero-art').querySelector('.hero-caption span').textContent='本期封面 · '+cover.name;}
for(const style of [...new Set(data.games.map(g=>g.style))].sort())$('style').add(new Option(style,style));
for(const structure of [...new Set(data.games.map(g=>g.structure))].sort())$('structure').add(new Option(structure,structure));
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
function syncURL(){try{const p=new URLSearchParams();for(const k of filterKeys)if(state[k]!==defaults[k])p.set(k,state[k]);history.replaceState(null,'',location.pathname+(p.size?'?'+p:'')+location.hash);}catch{}}
function subgenreOptions(){
 const groups=state.category?taxonomy.filter(t=>t.name===state.category):taxonomy;
 $('subgenre').innerHTML='<option value="">全部细分玩法</option>'+groups.map(t=>`<optgroup label="${escape(t.name)}">${t.subgenres.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join('')}</optgroup>`).join('');
 $('subgenre').value=state.subgenre;
}
function guideContent(t){return `<dl class="research-notes"><div><dt>核心循环 · 类型研究框架</dt><dd>${escape(t.loop)}</dd></div><div><dt>画面组织</dt><dd>${escape(t.visual)}</dd></div><div><dt>界面与反馈 · 待实测问题</dt><dd>${escape(t.interface)}</dd></div></dl>`;}
function renderGuide(){
 const t=taxonomy.find(t=>t.name===state.category);
 $('guide-title').textContent=t?`${t.name} · 开发研究提示`:'如何使用这份开发参考库';
 $('guide-content').innerHTML=t?guideContent(t):'<p>先按<strong>核心操作与决策</strong>选择主类型，再用细分玩法比较同类作品。把流程结构与美术风格交叉筛选，避免把“肉鸽”“像素”“平台”混在同一层。</p><p>每款的“设计研究”将画面观察与待验证问题并列。截图用于分析构图与信息层级；手感、动画时序、数值与性能仍需实测。</p>';
}
function taxonomyInfo(){showInfo('分类地图 · 从玩法到设计问题',`<p>这是一套面向开发参考的编辑分类，不是唯一标准或Steam官方分类。${taxonomy.length}个主类型、${subgenreParent.size}个细分方向；允许混合归类，全部视图按App ID去重。</p><p><strong>主类型回答“玩家主要在做什么”，流程结构回答“体验如何组织”，美术风格回答“画面如何表达”。</strong>恐怖、科幻是题材；合作是参与方式；它们不能替代核心玩法分类。</p>${taxonomy.map(t=>{const games=data.games.filter(g=>g.categories.includes(t.name));return `<section class="taxonomy-row"><h3>${escape(t.name)} <small>${games.length} 款 · 含小众发现</small></h3><p>${t.subgenres.map(escape).join(' / ')}</p>${guideContent(t)}<p class="taxonomy-examples">${games.length?'可对照：'+games.slice(0,3).map(g=>escape(g.name)).join('、'):'覆盖缺口：尚无独立完成全部审核的条目。空类不等于该类型没有纯二维精品。'}</p></section>`;}).join('')}`);}
function design(g){const t=taxonomy.find(t=>t.name===g.primaryGenre);showInfo(g.name+' · 设计研究',`<p><strong>${escape(g.primaryGenre)}</strong> → ${g.subgenres.map(escape).join(' / ')}<br>流程结构：${escape(g.structure)}<br>分类与结构为编辑归纳，允许交叉；不是对所有游戏模式的穷举。</p><h3>本作画面观察</h3><p>${escape(g.art)}</p><h3>可读性与取舍</h3><p>${escape(g.caveat)}</p><h3>同类设计研究提示 · 非本作实测结论</h3>${t?guideContent(t):''}<h3>建议怎样做对照</h3><p>选同一细分玩法的两款作品，分别标出玩家、目标、风险、可交互物和HUD的位置；比较截图缩小后的轮廓与信息层级。再做可运行原型验证动态反馈，避免直接照搬静态外观。</p><p><a href="${safeURL(g.store)}" target="_blank" rel="noopener noreferrer">打开本作官方媒体与介绍 ↗</a></p>`);}
function nav(){
 const eligible=data.games.filter(g=>state.tier==='all'||g.tier===state.tier);
 $('category-nav').innerHTML=[['',eligible.length],...data.categories.map(c=>[c,eligible.filter(g=>g.categories.includes(c)).length])].map(([c,n])=>`<button class="category ${state.category===c?'active':''}" data-category="${escape(c)}" aria-pressed="${state.category===c}">${escape(c||'全部类型')}<span>${n}</span></button>`).join('');
}
function card(g){
 const saved=favorites.has(g.id),when=g.capturedAt.slice(0,10);
 return `<article class="game" id="game-${g.id}" aria-labelledby="title-${g.id}">
 <div class="game-head"><div><h3 class="game-name" id="title-${g.id}">${escape(g.name)}</h3><p class="game-zh">${escape(g.zh)} · ${escape(g.developers.join(' / '))}</p></div><button class="game-bookmark" data-save="${g.id}" aria-pressed="${saved}" aria-label="${saved?'取消收藏':'收藏'} ${escape(g.name)}">${saved?'♥':'♡'}</button></div>
 <div class="tags"><button class="tag primary-genre" data-category="${escape(g.primaryGenre)}">${escape(g.primaryGenre)}</button>${g.subgenres.map(s=>`<button class="tag" data-subgenre="${escape(s)}">${escape(s)}</button>`).join('')}<span class="tag style">${escape(g.style)}</span>${g.tier==='discovery'?'<span class="tag discovery">小众发现 · 低样本</span>':''}</div>
 <p class="structure-note">流程结构 <span>${escape(g.structure)}</span></p>
 <div class="metrics"><div class="metric"><span class="metric-label">STEAM 好评率</span><strong class="metric-value rate">${g.rate.toFixed(1)}<small>%</small></strong><span class="metric-note">${g.rate>=95?'好评如潮区间':'特别好评区间'} · 按本页统一口径</span></div><div class="metric"><span class="metric-label">STEAM 购买者评价</span><strong class="metric-value">${fmt(g.total)}</strong><span class="metric-note">评价数量，不代表销量</span></div><div class="metric"><span class="metric-label">美术语言</span><strong class="metric-value small">${escape(g.style)}</strong><span class="metric-note">二维角色 / 二维场景</span></div><div class="metric"><span class="metric-label">STEAM 发售日期</span><strong class="metric-value small">${escape(g.date)}</strong><span class="metric-note">商店标注 · 可能为抢先体验日期</span></div></div>
 <div class="images" aria-label="${escape(g.name)} 截图">${g.screenshots.slice(0,3).map((s,i)=>`<button class="shot" data-shot="${g.id}" data-index="${i}" aria-label="放大 ${escape(g.name)} 第 ${i+1} 张截图"><img src="${safeURL(s.thumb)}" alt="${escape(g.name)} 官方实机截图 ${i+1}" loading="lazy" decoding="async" width="600" height="338"></button>`).join('')}</div>
 <div class="observations"><div class="observation"><h4>值得看的地方 · 美术观察</h4><p>${escape(g.art)}</p></div><div class="observation"><h4>阅读画面时留意 · 主观观察</h4><p>${escape(g.caveat)}</p></div></div>
 <div class="game-foot"><span>核验 ${when} · 全语言 / 全时间 / Steam 购买者</span><div class="game-links"><button class="text-button" data-design="${g.id}">设计研究</button><button class="text-button" data-evidence="${g.id}">二维依据与来源</button><a class="store" href="${safeURL(g.store)}" target="_blank" rel="noopener noreferrer">前往 Steam ↗</a></div></div></article>`;
}
function render(){
 const focused=document.activeElement;
 let restoreFocus=null;
 if(focused.matches('[data-save]'))restoreFocus=`[data-save="${CSS.escape(focused.dataset.save)}"]`;
 else if(focused.matches('[data-subgenre]'))restoreFocus=`#${focused.closest('.game').id} [data-subgenre="${CSS.escape(focused.dataset.subgenre)}"]`;
 else if(focused.matches('[data-category]')){
  const scope=focused.closest('.game');
  restoreFocus=`${scope?'#'+scope.id:'#category-nav'} [data-category="${CSS.escape(focused.dataset.category)}"]`;
 }
 const result=window.selectGames(data.games,state,favorites);
 $('games').className='games'+(view==='compact'?' compact':'');
 $('games').innerHTML=result.slice(0,limit).map(card).join('');
 $('empty').hidden=result.length>0;$('current-category').textContent=state.category||'全部类型';
 $('result-count').textContent=`${result.length} 款${state.favoritesOnly?'收藏':''}作品`;
 $('shown-count').textContent=result.length?`已展示 ${Math.min(limit,result.length)} / ${result.length} 款 · 多类型作品已去重`:'';
 $('load-more').hidden=result.length<=limit;
 $('favorite-count').textContent=[...favorites].filter(id=>gamesById.has(id)).length;
 $('favorites').setAttribute('aria-pressed',state.favoritesOnly);
 for(const id of ['exhibition','compact']){$(id).classList.toggle('active',view===id);$(id).setAttribute('aria-pressed',view===id);}
 for(const img of $('games').querySelectorAll('img')) img.addEventListener('error',()=>{img.hidden=true;const text=document.createElement('span');text.className='image-failure';text.textContent='截图加载失败 · 点击重试原图';img.parentElement.append(text);},{once:true});
 nav();subgenreOptions();renderGuide();syncURL();
 if(restoreFocus&&!focused.isConnected){
  const target=document.querySelector(restoreFocus)||$('current-category');
  if(target===$('current-category'))target.tabIndex=-1;
  target.focus({preventScroll:true});
 }
}
function syncControls(){subgenreOptions();for(const k of ['structure','style','tier','minRate','sort'])$(k).value=state[k];$('search').value=state.q;}
function reset(){state={...defaults};limit=12;syncControls();render();}
function showInfo(title,content){$('info-title').textContent=title;$('info-content').innerHTML=content;$('info-dialog').showModal();}
function method(){showInfo('这份图鉴如何收录',`
 <p>这是一份<strong>美术研究导向的精选图鉴</strong>，不是 Steam 全量普查或官方榜单。当前对 ${data.candidateCount} 款策展候选进行评分复核，正式收录 ${main.length} 款，小众发现 ${data.games.length-main.length} 款。</p>
 <h3>01 · 如何发现候选</h3><p>以 Steam250 的 2D、像素艺术榜单为检索入口（两个榜单合并 ${data.discoveryCount} 个唯一 App ID），结合手绘商店标签及逐类型补充。标签仅作发现线索，不作为纯 2D 的充分证明。榜单检索集合与最终人工候选集合不相同，未声称逐一审完所有榜单条目。</p><ul>${data.discoverySources.map(u=>`<li><a href="${safeURL(u)}" target="_blank" rel="noopener noreferrer">${escape(u)}</a></li>`).join('')}</ul>
 <h3>02 · 纯 2D 的边界</h3><p>核心人物与游玩场景使用二维素材。横版玩法不等于纯 2D：实际三维角色、三维场景承载的 2.5D、HD-2D 不收录。二维骨骼、视差、粒子、灯光，以及制作阶段将三维模型预渲染为二维精灵，不单独排除。</p><p>核验依赖官方描述、截图与可取得的制作资料，不是源代码或全流程运行审计。无法排除三维场景的作品先进入边界清单。每款的“二维依据与来源”可查看具体证据。</p>
 <h3>03 · 高评分采用同一口径</h3><p>正式图鉴：好评率 ≥90%，评价 ≥500 条。发现区：好评率 ≥90%，评价 100–499 条。低样本区不与成熟作品混为同一可靠性。百分比 = 好评数 ÷ 总评价数 ×100；筛选用未四舍五入数值，显示保留一位小数。</p><p>通过 <a href="https://partner.steamgames.com/doc/store/getreviews" target="_blank" rel="noopener noreferrer">Steam 官方评论接口</a>读取：language=all、purchase_type=steam、review_type=all、filter=all，过滤离题活动。采集日期 ${snapshotRange}，每款以其核验记录时间为准。近期、单语言、全部购买来源和界面默认分数可能不同；数据不会随浏览自动刷新。评价数不是销量。</p>
 <h3>04 · 美术观察不是官方评分</h3><p>关注色彩、轮廓、构图、材质、视觉层次和界面可读性。文字基于商店媒体与资料的主观观察，不代表通关、性能测试或逐帧动画评测。图鉴没有虚构综合分、画面打分或销量。</p>
 <h3>05 · 使用与素材</h3><p>点击截图放大，方向键切换，Esc 关闭。收藏保存在此浏览器；清理浏览器数据会移除收藏。截图直接来自 Steam CDN，需要联网；网络失败可点击原图重试或访问商店。官方截图可能包含剧情内容。</p><p>中文名有些为常见译名，以 Steam 英文正式名和 App ID 为准。截图版权归各自权利人所有，本站与 Valve 无隶属关系。</p><p><a href="catalog.json" download>下载完整数据与证据索引（JSON）</a></p>`);}
function boundary(){showInfo('边界与本轮未收录',`<p>严格纯二维优先。下列作品可能很优秀，但不能因此跳过渲染边界或统一评分门槛。</p><h3>2.5D、边界待核验或策展排除 · ${data.excluded.length} 项</h3>${data.excluded.map(g=>`<div class="audit-row"><strong>${escape(g.name)}</strong><p>${escape(g.reason)}</p>${g.source?`<a href="${safeURL(g.source)}" target="_blank" rel="noopener noreferrer">核验来源 ↗</a>`:''}</div>`).join('')}<h3>候选评分与资料门槛未通过 · ${data.rejected.length} 款</h3>${data.rejected.map(g=>`<div class="audit-row"><strong>${escape(g.name)}</strong><p>${escape(g.reason)}${g.total!==undefined?' · '+fmt(g.total)+' 条评价':''}</p><a href="https://store.steampowered.com/app/${g.id}/" target="_blank" rel="noopener noreferrer">Steam 商店 ↗</a></div>`).join('')}`);}
function evidence(g){showInfo(g.name+' · 核验记录',`<h3>纯二维依据</h3><p>${escape(g.evidence)}</p><h3>评分快照</h3><p>${escape(g.capturedAt)}<br>好评 ${fmt(g.positive)} / 差评 ${fmt(g.negative)} / 总计 ${fmt(g.total)}<br>好评率 ${g.rate.toFixed(4)}% · ${g.tier==='main'?'正式图鉴':'小众发现'}</p><p>全部语言、全部时间、Steam 购买者；排除离题活动。原始响应已留存于本地图鉴项目。</p><h3>来源</h3><ul>${[...new Set([g.store,...g.sources,g.reviewSource])].map(u=>`<li><a href="${safeURL(u)}" target="_blank" rel="noopener noreferrer">${u.includes('appreviews')?'Steam 原始评论统计 JSON':escape(u)}</a></li>`).join('')}</ul><h3>观察范围</h3><p>美术文字为基于官方媒体的主观解读。本轮未进行全流程实机、性能和逐帧动画测试。</p>`);}
function showImage(){const s=lightGame.screenshots[lightIndex];$('lightbox-title').textContent=lightGame.name;$('lightbox-counter').textContent=`${lightIndex+1} / ${lightGame.screenshots.length}`;$('lightbox-image').alt=lightGame.name+' 官方截图 '+(lightIndex+1);$('lightbox-image').src=s.full;}
function stepImage(n){if(lightGame){lightIndex=(lightIndex+n+lightGame.screenshots.length)%lightGame.screenshots.length;showImage();}}
document.addEventListener('click',e=>{
 const cat=e.target.closest('[data-category]');if(cat){state.category=cat.dataset.category;state.subgenre='';limit=12;render();if(!cat.classList.contains('category'))$('catalog').scrollIntoView();return;}
 const sub=e.target.closest('[data-subgenre]');if(sub){state.subgenre=sub.dataset.subgenre;state.category=subgenreParent.get(state.subgenre)||'';limit=12;render();return;}
 const save=e.target.closest('[data-save]');if(save){const id=Number(save.dataset.save);if(favorites.has(id))favorites.delete(id);else favorites.add(id);let persisted=true;try{localStorage.setItem('two-d-atlas-favorites',JSON.stringify([...favorites]));}catch{persisted=false;}const name=gamesById.get(id).name;render();toast(persisted?(favorites.has(id)?'已收藏 '+name:'已取消收藏 '+name):'浏览器存储不可用，收藏仅在本次浏览有效');return;}
 const shot=e.target.closest('[data-shot]');if(shot){lightGame=gamesById.get(Number(shot.dataset.shot));lightIndex=Number(shot.dataset.index);showImage();$('lightbox').showModal();return;}
 const ev=e.target.closest('[data-evidence]');if(ev)evidence(gamesById.get(Number(ev.dataset.evidence)));
 const research=e.target.closest('[data-design]');if(research)design(gamesById.get(Number(research.dataset.design)));
});
$('search').addEventListener('input',e=>{state.q=e.target.value;limit=12;render();});
for(const key of ['subgenre','structure','style','tier','minRate','sort'])$(key).addEventListener('change',e=>{state[key]=e.target.value;limit=12;render();});
$('favorites').onclick=()=>{state.favoritesOnly=!state.favoritesOnly;limit=12;render();};
for(const v of ['exhibition','compact'])$(v).onclick=()=>{view=v;try{localStorage.setItem('two-d-atlas-view',v);}catch{}render();};
 $('reset').onclick=reset;$('empty-reset').onclick=reset;$('load-more').onclick=()=>{
  const shown=$('games').children.length;
  limit+=12;render();
  const firstNew=$('games').children[shown]?.querySelector('.game-name');
  if(firstNew){firstNew.tabIndex=-1;firstNew.focus();}
 };
$('about').onclick=method;$('method-bottom').onclick=method;$('boundary').onclick=boundary;
$('taxonomy-map').onclick=taxonomyInfo;
$('close-info').onclick=()=>$('info-dialog').close();$('close-lightbox').onclick=()=>$('lightbox').close();
$('prev-image').onclick=()=>stepImage(-1);$('next-image').onclick=()=>stepImage(1);
for(const dialog of [$('lightbox'),$('info-dialog')])dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{if($('lightbox').open){if(e.key==='ArrowRight'){e.preventDefault();stepImage(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepImage(-1);}}else if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('info-dialog').open){e.preventDefault();$('search').focus();}});
syncControls();render();
})();
