/* Reading assistance only; the full, grouped body is delivered in HTML. */
(function () {
  'use strict';
  const layout = document.querySelector('.cross-layout');
  if (!layout) return;
  const profile = layout.dataset.readingProfile;
  const routes = [...layout.querySelectorAll('.lesson-route-links a')];
  const targets = routes.map(a => document.getElementById(a.hash.slice(1)));
  const toggle = layout.querySelector('.lesson-route-toggle');
  const routeBody = layout.querySelector('#cross-route');
  const narrow = matchMedia('(max-width:900px)');
  function setRoute(open) { toggle.setAttribute('aria-expanded', String(open)); routeBody.hidden = !open; }
  setRoute(!narrow.matches);
  toggle.addEventListener('click', () => setRoute(routeBody.hidden));
  narrow.addEventListener('change', () => setRoute(!narrow.matches));
  layout.querySelector('.lesson-route-links').addEventListener('click', e => { if(e.target.closest('a') && narrow.matches) setRoute(false); });
  let current = 0, queued = false;
  function update() {
    current = 0;
    targets.forEach((t,i) => { if (t.getBoundingClientRect().top <= innerHeight*.4) current = i; });
    routes.forEach((a,i) => i === current ? a.setAttribute('aria-current','location') : a.removeAttribute('aria-current'));
    queued = false;
  }
  addEventListener('scroll', () => { if(!queued) { queued=true; requestAnimationFrame(update); } }, {passive:true});
  update();
  const key = 'reading-place:v1:' + decodeURI(location.pathname);
  const status = layout.querySelector('.lesson-save-status');
  function resume(id) {
    const a = document.createElement('a'); a.href='#'+id; a.textContent='回到上次记下的位置'; status.appendChild(a);
  }
  try { const saved=localStorage.getItem(key); if(targets.some(t => t.id===saved)) resume(saved); }
  catch(_) { status.textContent='此浏览器不能读取已保存位置。'; }
  layout.querySelector('.lesson-save').addEventListener('click', () => {
    update();
    try { localStorage.setItem(key,targets[current].id); status.textContent='已记住：'+routes[current].textContent+'。'; resume(targets[current].id); }
    catch(_) { status.textContent='未保存：浏览器存储不可用。可复制当前章节链接作为书签。'; }
  });
  // Lookup gives jump results, never hides table rows or the original body.
  const input=layout.querySelector('#reading-query');
  if(input) {
    const rows=[...layout.querySelectorAll('.cross-unit table tbody tr')];
    rows.forEach((row,i) => { if(!row.id) row.id='lookup-row-'+(i+1); });
    const list=layout.querySelector('.cross-search-results'), count=layout.querySelector('#reading-search-status');
    function search() {
      list.replaceChildren();
      const words=input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      if(!words.length) { count.textContent='输入关键词定位条目；正文不会被隐藏。'; return; }
      const hits=rows.filter(row => words.every(w => row.textContent.toLowerCase().includes(w)));
      count.textContent=hits.length ? '找到 '+hits.length+' 条，显示前 '+Math.min(hits.length,10)+' 条定位入口；完整正文始终保留。' : '没有匹配条目。试试更短的报错片段，或使用“不报错，但结果不对”入口。';
      hits.slice(0,10).forEach(row => { const li=document.createElement('li'), a=document.createElement('a'); a.href='#'+row.id; a.textContent=row.cells[0].textContent; li.appendChild(a); list.appendChild(li); });
    }
    input.addEventListener('input',search);
    layout.querySelector('.cross-search-clear').addEventListener('click', () => {input.value=''; search(); input.focus();});
  }
  const R = s => s.replaceAll('@',String.fromCharCode(92));
  // Each rule identifies a full formula. A symbol receives no fallback meaning.
  // [fragment, name, meaning, role in this formula, small example]
  const rules = {
    svm: [
      {has:R('@min_{w,b}'), not:R('@underbrace'), parts:[
        [R('@frac{1}{2}@|w@|^2'),'½‖w‖²：间隔目标','权重长度的平方乘以一半。','在满足右侧分类约束时最小化它；采用支持向量函数间隔为 1 的缩放，较小的 ‖w‖ 对应较宽的几何间隔。','若 ‖w‖ 从 2 降到 1，单侧几何间隔从 0.5 增到 1。'],
        [R('y_i(w^@top x_i+b)'),'带标签的分类间隔','分类分数乘上真实标签（+1 或 −1）。','把正负两类统一成一个约束：结果至少为 1，才既分对又留下约定的余量。','标签 −1，模型分数 −2：乘积为 2，满足约束。'] ]},
      {has:R('@max_{@alpha}'), parts:[
        [R('x_i^@top x_j'),'样本内积','两个训练样本对应坐标乘积的和。','对偶目标里只通过内积使用输入，可以用核 K(xᵢ,xⱼ) 替换，避免显式写出高维映射。','线性核直接返回这个点积；换核改变相似度，并不是改标签。'],
        [R('@sum_i @alpha_i'),'乘子之和','所有样本的拉格朗日乘子相加。','这是被最大化目标的正向项，但乘子还受约束，且另一项会抵消一部分收益，不能单独无限增大。','还必须满足 αᵢ ≥ 0 与 Σαᵢyᵢ = 0。'] ]},
      {has:R('@min_{w,b,@xi}'), parts:[
        [R('C@sum_i @xi_i'),'CΣξᵢ：违规代价','把所有松弛变量相加，再乘罚款系数。','与权重惩罚一起最小化。C 控制训练违规的代价，而不是几何距离本身。','Σξᵢ = 2 时，C = 3 的这一项是 6。'],
        [R('1 - @xi_i'),'允许放宽的阈值','用 1 减去第 i 个样本的松弛量。','它把硬间隔约束放宽；ξ=0 不放宽，ξ>1 允许样本分错。','ξ=0.3 时阈值是 0.7；样本可以进入间隔带，仍在正确侧。'] ]},
      {has:R('@text{Hinge 损失}'), parts:[
        [R('@max(0,@, 1 - y_i(w^@top x_i + b))'),'Hinge：安全余量不足的损失','在 0 和“1 减分类间隔”之间取较大值。','分类间隔达到 1 时这项变为 0；分对但余量不足时仍要付损失。','分类间隔 0.4 → 损失 0.6；间隔 1.3 → 损失 0。'],
        [R('@frac{1}{2C}@|w@|^2'),'1/(2C)：正则化系数','用 C 的倒数缩放权重平方。','将软间隔目标整体除以 C 后得到这项，最优解不变（C>0）；C 越小，此项相对越重。','这份写法用损失求和；换成平均损失时须重新核对系数。'] ]},
      {has:R('@text{sign}'), parts:[
        [R('K(x_i, x)'),'核函数：支持向量与新样本的相似度','对一个支持向量和待预测样本计算核值。','它乘以 αᵢyᵢ，加入所有支持向量的加权和，最后加偏置并取符号。','线性核是 xᵢᵀx；RBF 核按样本距离给出相似度。'],
        [R('@text{sign}'),'sign：把分数变成类别','查看括号内分数的正负。','它是预测的最后一步，不是训练损失，也不是概率校准。','分数 +0.8 对应正类；−0.8 对应负类，边界为 0。'] ]}
    ],
    'matrix-factorization': [
      {has:R('@sum_{f=1}'), parts:[
        [R('@mathbf{p}_u^@top @mathbf{q}_i'),'用户与物品的点积','把两个向量对应的数相乘再相加。','这条预测公式用它作为用户 u 对物品 i 的匹配分；结果不是天然的概率。','两维示例：[1, 2] 与 [3, 1] 的点积为 5。'],
        [R('@hat{r}_{ui}'),'预测评分','模型给用户 u 与物品 i 这一对算出的分数。','它由点积产生；训练时再和已观测的 rᵤᵢ 比较。','未知格子也能打分，但是否准确仍须用留出的数据验证。'] ]},
      {has:R('@min_{P,Q}'), parts:[
        [R('@left( r_{ui} - @mathbf{p}_u^@top @mathbf{q}_i @right)^2'),'平方误差','真实评分减去预测评分，再平方。','只对观测集合 K 里的用户—物品对求和；未知不自动等于零分。','真实 4 分、预测 3 分，这一对的误差平方是 1。'],
        [R('@lambda'),'λ：向量大小的代价','正则化项的权重。','在这条按观测评分求和的目标中，它平衡拟合误差与向量的平方大小。','λ 大时大数值向量更贵；仍需用验证集选择。'] ]},
      {has:R('@text{全局均分}'), parts:[
        [R('@mu'),'μ：全局均分','所有观察评分的基准水平。','先给预测一个整体起点，再叠加用户、物品偏置和个性化匹配。','基准 3.5，加用户偏置 0.2、物品偏置 0.1、匹配 0.3，得到 4.1。'],
        ['b_u','用户偏置','该用户相对整体水平的打分倾向。','它解释“这个人普遍打高分或低分”，把这部分从个性化匹配中分开。','同样喜欢程度下，偏置 +0.2 会让预测高 0.2。'],
        ['b_i','物品偏置','该物品相对整体水平的评分倾向。','它解释很多用户共同给这件物品的高低分倾向，不等于某个人的独特口味。','物品偏置 −0.1，会把基准预测调低 0.1。'],
        [R('@mathbf{p}_u^@top @mathbf{q}_i'),'个性化匹配','用户与物品向量的点积。','前三项解释整体偏置，这一项再解释这一对特有的匹配。','用户与物品都有相近潜在偏好时，对应维度可以提供更高匹配分。'] ]},
      {has:R('c_{ui}@left'), parts:[
        ['c_{ui}','置信度权重','每一个用户—物品对在损失中的权重。','隐式 ALS 的所有格子都参加目标；未交互的低权重零标签不等于已确认“不喜欢”。','按文中 c=1+αr，α=2、r=3 时权重为 7；r=0 时权重为 1。'],
        ['y_{ui}','是否发生交互','有交互记 1，未交互记 0。','这不是显式评分 rᵤᵢ；配合置信度表达我们对该标签有多大把握。','播放过对应 1，没有播放记录对应低置信度的 0。'] ]},
      {has:R('@ln @sigma'), parts:[
        [R('@hat{r}_{ui} - @hat{r}_{uj}'),'正负物品的分差','同一用户对交互过物品 i 的分数，减去采样物品 j 的分数。','BPR 希望这项为正且更大，直接优化相对顺序，而不是逼近一个绝对星级。','i 得 2 分、j 得 1 分，分差为 1，顺序符合当前训练对。'],
        [R('@ln @sigma'),'log-sigmoid 组合','先用 sigmoid 映射分差，再取对数。','目标最大化这项：正向分差越大，值越接近 0；顺序颠倒时会受到较强惩罚。','分差为 0 时 σ=0.5，ln σ≈−0.693。'],
        [R('@lambda@|@Theta@|^2'),'参数平方惩罚','全部模型参数的平方大小乘 λ。','这里目标是最大化，所以用减号扣除这一项；别和最小化目标中的加号混淆。','两组排序同样好时，参数平方和更小的一组扣分更少。'] ]}
    ]
  };
  const formulaRules=rules[profile];
  if(!formulaRules || !window.katex) return;
  const dialog=document.createElement('dialog'); dialog.id='formula-explainer'; dialog.setAttribute('aria-labelledby','formula-dialog-title');
  dialog.innerHTML='<div class="formula-dialog-inner"><div class="formula-dialog-top"><div><small>当前公式的局部读法</small><h2 id="formula-dialog-title"></h2></div><button type="button" class="formula-dialog-close" aria-label="关闭公式解释">×</button></div><div class="formula-dialog-selected"></div><p class="formula-dialog-meaning"></p><h3>在这条公式中做什么</h3><p class="formula-dialog-role"></p><div class="formula-dialog-example"><h3>看一个小例子</h3><p></p></div><details><summary>对照整条公式</summary><div class="formula-dialog-context"></div></details><button class="formula-dialog-footer" type="button">关闭，继续读</button></div>';
  document.body.appendChild(dialog); let opener;
  const render=(tex,node) => katex.render(tex,node,{throwOnError:false,strict:'ignore',trust:false,displayMode:true});
  function show(part,tex,from) {
    opener=from;
    dialog.querySelector('h2').textContent=part[1];
    dialog.querySelector('.formula-dialog-meaning').textContent=part[2];
    dialog.querySelector('.formula-dialog-role').textContent=part[3];
    dialog.querySelector('.formula-dialog-example p').textContent=part[4];
    render(part[0],dialog.querySelector('.formula-dialog-selected'));
    render(tex,dialog.querySelector('.formula-dialog-context'));
    dialog.querySelector('details').open=false;
    dialog.showModal(); dialog.scrollTop=0; document.body.classList.add('formula-modal-open');
    dialog.querySelector('.formula-dialog-close').focus({preventScroll:true});
  }
  dialog.querySelectorAll('button').forEach(b => b.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {document.body.classList.remove('formula-modal-open'); opener?.focus({preventScroll:true});});
  dialog.addEventListener('click',e => { if(e.target===dialog) {const r=dialog.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close();} });
  layout.querySelectorAll('.cross-body .katex-display').forEach(display => {
    const tex=display.querySelector('annotation')?.textContent;
    if(!tex) return;
    const rule=formulaRules.find(r => tex.includes(r.has) && (!r.not || !tex.includes(r.not)));
    if(!rule) return;
    let annotated=tex; const parts=[];
    rule.parts.forEach(part => {
      if(!annotated.includes(part[0])) return;
      const id=parts.length; parts.push(part);
      annotated=annotated.replace(part[0],R('@htmlData{cross-term='+id+'}{')+part[0]+'}');
    });
    if(!parts.length) return;
    display.dataset.originalTex=tex;
    // Render into a fresh child, preserving the surrounding label and paragraph.
    const host=document.createElement('span');
    katex.render(R('@displaystyle ')+annotated,host,{throwOnError:false,strict:'ignore',trust:c=>c.command===R('@htmlData')});
    display.replaceChildren(host);
    const wrap=document.createElement('span'); wrap.className='cross-formula'; wrap.style.display='block'; display.replaceWith(wrap); wrap.appendChild(display);
    const hint=document.createElement('span'); hint.className='formula-trigger-hint'; hint.style.display='block'; hint.textContent='点虚线下方的公式项，或用下方按钮看本式解释。'; wrap.appendChild(hint);
    const controls=document.createElement('span'); controls.className='formula-parts'; wrap.appendChild(controls);
    parts.forEach((part,id) => {
      display.querySelectorAll('[data-cross-term="'+id+'"]').forEach(el => {
        el.classList.add('formula-target'); el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label','解释 '+part[1]); el.setAttribute('aria-haspopup','dialog');
        el.addEventListener('click',()=>show(part,tex,el)); el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(part,tex,el);}});
      });
      const b=document.createElement('button'); b.type='button'; b.textContent=part[1]; b.setAttribute('aria-haspopup','dialog'); b.addEventListener('click',()=>show(part,tex,b)); controls.appendChild(b);
    });
  });
})();
