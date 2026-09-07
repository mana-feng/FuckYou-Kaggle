/* Preserve source nodes; explain formula parts in their lesson context. */
(function () {
  "use strict";
  const layout = document.querySelector(".lesson-layout");
  if (!layout) return;
  const isTree = layout.dataset.lesson === "tree";
  const profile = window.guidedLessonProfiles?.[layout.dataset.lesson];
  const R = s => s.replaceAll("@", String.fromCharCode(92));
  const terms = {
    objective: ["训练目标 Obj", "给当前这棵新树打分的目标函数。", "同时计算预测误差和树的复杂度，训练希望它尽量小。带星号的 Obj* 表示固定树结构、把叶子输出优化后得到的分数。", "两棵树预测同样好时，叶子更少、输出更温和的树可能得到更小的目标值。"],
    loss: ["损失函数 l", "衡量预测值离真实值有多远。", "在目标函数里，它负责“预测得好不好”；每个样本算一次，再加起来。它不负责惩罚树的复杂度，那是 Ω 的工作。", "若用半平方误差，真实值是 5、预测值是 3，损失就是 ½ × (5 − 3)² = 2。"],
    newTree: ["新树的输出 fₜ(xᵢ)", "第 t 棵新树对第 i 个样本给出的修正量。", "它被加到旧预测上。样本落在哪个叶子，就得到那个叶子的输出 w；不是重新从零预测。", "旧预测是 3，新树给 +1，合起来就是 4。实际更新时还会用学习率缩小新树的贡献。"],
    prediction: ["旧预测 ŷ", "加入当前这棵树之前，模型已经给出的预测。", "训练新树时把旧预测当作已知值；g、h 都在这个位置计算。新树负责在这个基础上修正。", "前面所有树合起来预测 3，真实值是 5。当前要研究的是怎样把 3 往 5 修正。"],
    target: ["真实值 yᵢ", "第 i 个样本的已知答案。", "损失函数把它和预测比较，判断误差有多大；它是监督信号。", "预测销量时，某天真实卖出 5 件，标签 y 就是 5。"],
    input: ["样本特征 xᵢ", "第 i 个样本用于预测的输入。", "新树根据这些特征沿分支向下走，找到这个样本所属的叶子。", "预测销量时，特征可以包括价格、是否周末；树据此选择一个叶子。"],
    regularizer: ["复杂度惩罚 Ω(f)", "给树的复杂程度加上的成本。", "γT 惩罚叶子太多；½λΣw² 惩罚叶子输出太大。它与样本损失相加，避免只追求训练集误差。", "即使多一个叶子能降低一点误差，也要看这点改善是否足以支付新叶子的成本。"],
    leafCost: ["叶子总成本 γT", "每片叶子交 γ，总共有 T 片叶子。", "它是 Ω 中惩罚树规模的部分。把一片叶子分成两片时，T 净增加 1，所以 Gain 要扣 γ。", "γ = 0.5，4 片叶子的总成本是 2；再多一片，总成本增加 0.5。"],
    gamma: ["γ：新叶子的成本", "每增加一个叶子，目标函数中增加的固定惩罚。", "Gain 中的 −γ 会把微小收益抵消掉。γ 越大，一次分裂就需要更大的改善才值得。", "原本改善是 0.3，γ = 0.5，那么净收益是 −0.2，这一刀不值得切。"],
    lambda: ["λ：叶子输出的约束", "对叶子输出施加 L2 惩罚的强度。", "它出现在 H + λ 的分母里。其他值固定时，λ 增大，会把最优输出往 0 拉。", "G = −4、H = 2：λ = 1 时输出约 +1.33；λ = 2 时输出变成 +1。"],
    leafCount: ["T：叶子数", "这棵新树一共有多少片叶子。", "它控制叶子求和的范围，同时和 γ 相乘构成树规模的成本。", "一个叶子拆成左右两个，叶子总数净增加 1。"],
    weight: ["叶子输出 w", "同一片叶子里的所有样本共享的修正量。", "带 * 的 w* 是固定叶子样本、在 H + λ > 0 时，使二阶近似目标最小的输出。其他位置的 w 表示尚待优化的叶子输出。", "左叶包含 g = −3、−1 两个样本，H = 2、λ = 1，则 w* = −(−4)/(2 + 1) ≈ +1.33。"],
    gradient: ["gᵢ：一个样本的斜率", "损失对预测值的一阶导数。", "它说明预测稍微增大时，损失往哪边变化。新树通常沿负梯度方向修正。g 可以为正，也可以为负。", "半平方误差下 g = 预测 − 真实。预测 3、真实 5 时，g = −2，说明应向上修正预测。"],
    hessian: ["hᵢ：一个样本的曲率", "损失对预测值的二阶导数。", "它描述斜率变化得多快，在二阶近似里决定弯曲程度。它不是“模型的可信度”。推导最优解需要叶子的 H + λ 为正。", "半平方误差的 h 恒为 1。二分类逻辑损失对原始分数求导时，h = p(1 − p)。"],
    gradientSum: ["G：叶内斜率之和", "把一个叶子里所有样本的 g 加起来。", "决定叶子整体的修正方向。G 为负时，−G 为正；G 为正时，最优修正通常为负。下标 j、L、R 指某个叶子、左叶、右叶。", "A、B 的 g 为 −3、−1，左叶 G = −4；C、D 的 g 都是 +2，右叶 G = +4。"],
    hessianSum: ["H：叶内曲率之和", "把一个叶子里所有样本的 h 加起来。", "它和 λ 一起组成叶子输出的分母。不要把这里的 H 与 04 章表示熵的 H(D) 混在一起。", "本例每个样本 h = 1。两个样本的叶子 H = 2，四个样本的叶子 H = 4。"],
    sum: ["Σ：把这些项加起来", "按上下标指定的范围逐项求和。", "对样本求和，是合并样本的贡献；对叶子求和，是合并叶子的目标或惩罚；在基尼公式中，是把各类别占比的平方加起来。", "Σgᵢ 可以读成“把这一片叶子里每个样本的 g 加起来”。Σpₖ² 则是“把每一类的占比平方加起来”。"],
    gain: ["分裂增益 Gain", "一次切分带来的净改善。", "XGBoost 中，它是分裂前的最优近似目标减去分裂后的最优近似目标，即 ½ ×（左项 + 右项 − 父项）− γ。通常越大越值得切。", "本例左右 G 分别是 −4、+4，H 都为 2；λ = 1、γ = 0.5 时，Gain = ½ × (16/3 + 16/3 − 0) − 0.5 ≈ 4.83。"],
    entropy: ["熵 H(D)", "衡量这一群样本的类别有多混杂。", "在信息增益里，用切前的熵减去切后各分支熵的加权平均。熵越低，类别越集中。", "二分类使用以 2 为底的对数时：正负各半，熵为 1；全是同一类，熵为 0。"],
    branchWeight: ["分支权重 |Dᵛ| / |D|", "某个分支的样本数占总样本数的比例。", "让大分支在切后熵的平均值中占更大权重，避免一个只有极少样本的纯分支主导评价。", "20 个样本中有 5 个进入某分支，这个分支的权重就是 5/20 = 0.25。"],
    informationGain: ["信息增益 Gain(D, a)", "按特征 a 切分后，不确定性减少了多少。", "切前熵减去切后加权熵。它会偏爱把训练样本分成很多小群的特征，因此用户 ID 可能获得很高分。", "切前正负各半，熵为 1；切后两群各为 9:1 和 1:9，加权熵约 0.469，信息增益约 0.531。"],
    gainRatio: ["增益率 GainRatio", "信息增益除以分支本身的熵 IV。", "用分裂信息 IV 对信息增益做归一化，缓解取值过多的偏好。只有 IV > 0 时才能相除；它也不保证永远挑到最佳特征。", "每人一个 ID 分成 20 个等大分支时，IV = log₂20 ≈ 4.32，增益率约 1/4.32 = 0.231。"],
    splitInfo: ["IV(a)：分裂信息", "只看样本被分到各分支的比例，不看类别标签。", "它是增益率的分母。分支多而均匀时通常更大；所有样本都进同一分支时为 0，不能直接做除法。", "分成两个等大分支，IV = 1；分成 20 个等大分支，IV ≈ 4.32。"],
    gini: ["Gini(D)：基尼系数", "衡量这一群样本的类别混杂程度。", "把各类别占比平方后相加，再用 1 减掉；越接近单一类别，结果越小。分裂时比较子节点的加权基尼。", "正负各半：1 − 0.5² − 0.5² = 0.5；正负为 9:1：1 − 0.9² − 0.1² = 0.18。"],
    probability: ["pₖ：第 k 类的占比", "这一群中属于第 k 类的样本数，除以这一群的总样本数。", "pₖ² 放大“占比较大的类别”的贡献。所有类别的占比加起来等于 1。", "10 个样本中，9 个为正类，正类的 p = 0.9；另一个类别的 p = 0.1。"],
    lossGroup: ["整项损失：旧预测加上新修正", "把更新后的预测送进损失函数，再和真实值比较。", "这里的组合顺序是：先算 ŷ + fₜ(xᵢ)，再算 l(yᵢ, ŷ + fₜ(xᵢ))。外层的 l 判断这次修正有没有帮助。", "真实值 5，旧预测 3，新树输出 +1。半平方误差从 2 降为 0.5，因为新的预测变成了 4。"],
    newPrediction: ["更新后的预测 ŷ + fₜ(xᵢ)", "旧模型的预测与当前新树输出相加。", "Boosting 累加的是预测修正量，不是把一棵旧树替换掉。推导先求未缩放的修正，再通过学习率控制实际更新。", "旧预测 3，加上新树的 +1 得到 4；若学习率为 0.1，实际加 0.1，得到 3.1。"],
    l2Penalty: ["叶子输出的平方惩罚", "把各叶子的输出平方后相加，再乘上 λ/2。", "平方让很大的正负输出都产生更高成本。它与叶子数成本 γT 一起组成 Ω。", "两个叶子的输出是 +2、−2，λ = 1，则惩罚是 ½ × (4 + 4) = 4。"],
    gainParts: ["左项 + 右项 − 父项", "把“分开优化”比“共用一个输出”多得到的改善算出来。", "每个 G²/(H + λ) 项对应一个叶子的改善量尺度。左右相加后减父项，再乘 ½ 并扣 γ，才是完整 Gain。", "本例父叶的 G = 0，父项为 0；左右分别是 16/3，所以减去新叶成本后仍有正收益。"]
  };
  const groupMath = {
    lossGroup:R("l(y_i,@hat y_i^{(t-1)}+f_t(x_i))"),
    newPrediction:R("@hat y_i^{(t-1)}+f_t(x_i)"),
    l2Penalty:R("@frac12@lambda@sum_{j=1}^T w_j^2"),
    gainParts:R("@frac{G_L^2}{H_L+@lambda}+@frac{G_R^2}{H_R+@lambda}-@frac{G^2}{H+@lambda}")
  };
  if (profile) Object.assign(terms, profile.terms);
  const tokenPattern = /\\text\{(?:GainRatio|Gain|Gini|Obj)\}(?:\^\{(?:\(t\)|\*)\})?|\\text\{[^{}]*\}|\\frac\{\|D\^v\|\}\{\|D\|\}|\\Omega\(f(?:_t)?\)|\\hat\s*y(?:_i)?(?:\^\{\(t-1\)\})?|\\sum(?:_\{[^{}]*\}|_[a-z])?(?:\^\{[^{}]*\}|\^[A-Za-z0-9])?|\\gamma\s*T|\\gamma|\\lambda|f_t(?:\(x_i\))?|[GH]_(?:[jLR]|\{[jLR]\})(?:\^\{?2\}?)?|H\(D(?:\^v)?\)|IV\(a\)|[gh]_i|w_j(?:\^\{\*\}|\^\*)?|p_k(?:\^2)?|y_i|x_i|\b[GH]\b|\bT\b|(?<![A-Za-z\\])l(?=\\big|\()/g;
  function termFor(token) {
    if (profile) return profile.termFor(token);
    if (/^\\text\{/.test(token)) {
      if (token.includes("GainRatio")) return "gainRatio";
      if (token.includes("Gain")) return isTree ? "informationGain" : "gain";
      if (token.includes("Gini")) return "gini";
      if (token.includes("Obj")) return "objective";
      return null;
    }
    if (token.startsWith(R("@frac"))) return "branchWeight";
    if (token.startsWith(R("@Omega"))) return "regularizer";
    if (token.startsWith(R("@hat"))) return "prediction";
    if (token.startsWith(R("@sum"))) return "sum";
    if (/^\\gamma\s*T$/.test(token)) return "leafCost";
    if (token === R("@gamma")) return "gamma";
    if (token === R("@lambda")) return "lambda";
    if (token.startsWith("f_t")) return "newTree";
    if (token.startsWith("H(D")) return "entropy";
    if (token.startsWith("IV(")) return "splitInfo";
    if (token.startsWith("G")) return "gradientSum";
    if (token.startsWith("H")) return "hessianSum";
    if (token === "g_i") return "gradient";
    if (token === "h_i") return "hessian";
    if (token.startsWith("w_j")) return "weight";
    if (token.startsWith("p_k")) return "probability";
    return {y_i:"target", x_i:"input", T:"leafCount", l:"loss"}[token] || null;
  }
  const full = layout.querySelector(".lesson-full");
  let card = null, parentCard = null, serial = 0;
  Array.from(full.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.matches(".lesson-divider")) return;
    if (node.nodeType === 1 && /^H[23]$/.test(node.tagName)) {
      card = document.createElement("section");
      const nested = (layout.dataset.batch === 'ml-rest' || layout.dataset.lesson === 'backprop') && node.tagName === 'H3' && parentCard;
      card.className = nested ? "lesson-subsection" : "lesson-detail-card";
      if (nested) parentCard.appendChild(card);
      else {full.insertBefore(card, node);parentCard = card;}
      if (!node.id) node.id = "lesson-detail-" + (++serial);
    }
    if (card) card.appendChild(node);
  });
  full.querySelectorAll(".lesson-detail-card").forEach(section => {
    const heading = section.querySelector("h2,h3");
    if (heading) section.setAttribute("aria-labelledby", heading.id);
  });
  const routes = Array.from(layout.querySelectorAll("[data-route]"));
  const extraRoutes = profile ? Array.from(full.querySelectorAll("h2:not(.lesson-original-title)")).map(h => [h.id, h.textContent.replace(/^[^\p{L}\p{N}]+/u, "")]) : isTree
    ? [["full-lesson","完整图解与判据"],["id3-cart","ID3、C4.5、CART"]]
    : [["xgboost-gbdt","完整推导"],["xgboost-lightgbm-catboost","三种框架对照"],["_11","本节检查点"]];
  extraRoutes.forEach(([id,label]) => {
    const target = document.getElementById(id);
    if (target) { target.dataset.route = label; routes.push(target); }
  });
  const nav = layout.querySelector(".lesson-route-links");
  const links = routes.map((target,i) => {
    const a = document.createElement("a");
    a.href = "#" + target.id;
    a.textContent = (i + 1) + "  " + target.dataset.route;
    nav.appendChild(a);
    return a;
  });
  let activeIndex = 0;
  function updatePosition() {
    let current = 0;
    routes.forEach((target,i) => { if (target.getBoundingClientRect().top < innerHeight * .45) current = i; });
    activeIndex = current;
    links.forEach((a,i) => i === current ? a.setAttribute("aria-current","step") : a.removeAttribute("aria-current"));
    layout.querySelector(".lesson-position").textContent = profile?.lookup ? "分类导航 · 不必按顺序阅读" : "正在读第 " + (current + 1) + " / " + routes.length + " 站";
    layout.querySelector(".lesson-track span").style.width = ((current + 1) / routes.length * 100) + "%";
  }
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { updatePosition(); ticking = false; }); } }, {passive:true});
  updatePosition();
  const routeToggle = layout.querySelector(".lesson-route-toggle");
  const routeBody = layout.querySelector("#lesson-route");
  const narrow = matchMedia("(max-width:900px)");
  function setRoute(open) { routeToggle.setAttribute("aria-expanded",String(open)); routeBody.hidden = !open; }
  setRoute(!narrow.matches);
  narrow.addEventListener("change", () => setRoute(!narrow.matches));
  routeToggle.addEventListener("click",() => setRoute(routeBody.hidden));
  nav.addEventListener("click", e => {
    if (e.target.closest("a") && narrow.matches) setRoute(false);
  });
  const saveKey = "lesson-place:" + layout.dataset.lesson;
  const status = layout.querySelector(".lesson-save-status");
  const save = layout.querySelector(".lesson-save");
  let saved = null;
  try { saved = localStorage.getItem(saveKey); } catch (_) {}
  if (saved && routes.some(route => route.id === saved)) {
    const resume = document.createElement("a");
    resume.href = "#" + saved;
    resume.textContent = "回到上次记下的位置";
    status.appendChild(resume);
  }
  save.addEventListener("click",() => {
    try {
      localStorage.setItem(saveKey,routes[activeIndex].id);
      status.textContent = "已记住：" + routes[activeIndex].dataset.route;
    } catch (_) { status.textContent = "浏览器暂时不能保存；可以收藏当前页面地址。"; }
  });
  const dialog = document.createElement("dialog");
  dialog.id = "formula-explainer";
  dialog.setAttribute("aria-labelledby","formula-dialog-title");
  dialog.innerHTML = '<div class="formula-dialog-inner"><div class="formula-dialog-top"><div><small class="formula-dialog-caption"></small><h2 id="formula-dialog-title"></h2></div><button class="formula-dialog-close" type="button" aria-label="关闭公式解释">×</button></div><div class="formula-dialog-selected"></div><p class="formula-dialog-meaning"></p><h3>在这条公式里做什么</h3><p class="formula-dialog-role"></p><div class="formula-dialog-example"><h3>看个小例子</h3><p></p></div><details><summary>再看一眼整条公式</summary><div class="formula-dialog-context"></div></details><button type="button" class="formula-dialog-footer">明白了，继续读</button></div>';
  document.body.appendChild(dialog);
  let opener = null;
  function closeDialog() { dialog.close(); }
  dialog.querySelector(".formula-dialog-close").addEventListener("click",closeDialog);
  dialog.querySelector(".formula-dialog-footer").addEventListener("click",closeDialog);
  dialog.addEventListener("click",event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });
  dialog.addEventListener("close",() => {
    document.body.classList.remove("formula-modal-open");
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  });
  function plainRender(tex, element, displayMode) {
    if (window.katex) {
      try { window.katex.render(tex,element,{displayMode,throwOnError:true,trust:false,strict:"ignore"}); return; } catch (_) {}
    }
    element.textContent = tex;
  }
  function explain(trigger) {
    const id = trigger.dataset.term, term = terms[id];
    if (!term) return;
    const box = trigger.closest(".formula-box") || trigger._formulaBox;
    opener = trigger;
    dialog.querySelector(".formula-dialog-caption").textContent = "你正在看：" + (box?.dataset.formulaName || (isTree ? "决策树的切分判据" : "XGBoost 的目标与更新"));
    dialog.querySelector("h2").textContent = term[0];
    dialog.querySelector(".formula-dialog-meaning").textContent = term[1];
    dialog.querySelector(".formula-dialog-role").textContent = term[2];
    dialog.querySelector(".formula-dialog-example p").textContent = term[3];
    plainRender(trigger.dataset.math || groupMath[id] || "",dialog.querySelector(".formula-dialog-selected"),false);
    plainRender(box?.dataset.originalMath || "",dialog.querySelector(".formula-dialog-context"),true);
    dialog.querySelector("details").open = false;
    document.body.classList.add("formula-modal-open");
    dialog.showModal();
    dialog.querySelector(".formula-dialog-close").focus();
  }
  document.addEventListener("click",event => {
    const trigger = event.target.closest(".formula-target,[data-formula-part]");
    if (trigger) explain(trigger);
  });
  document.addEventListener("keydown",event => {
    const trigger = event.target.closest(".formula-target");
    if (trigger && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); explain(trigger); }
  });
  function makePart(id, math, box) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.formulaPart = "true";
    button.dataset.term = id;
    button.dataset.math = math;
    button.setAttribute("aria-haspopup","dialog");
    button.setAttribute("aria-controls",dialog.id);
    button.textContent = terms[id][0];
    button._formulaBox = box;
    return button;
  }
  function interactiveMath() {
    if (!window.katex) return;
    if (window.renderMathInElement) window.renderMathInElement(layout,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false});
    Array.from(layout.querySelectorAll(".katex-display")).forEach(display => {
      const annotation = display.querySelector('annotation[encoding="application/x-tex"]');
      if (!annotation) return;
      const original = annotation.textContent;
      const occurrences = [];
      let annotated = original.replace(profile?.pattern || tokenPattern, token => {
        const term = termFor(token);
        if (!term) return token;
        const index = occurrences.push({term,math:token}) - 1;
        return R("@htmlClass{formula-target formula-token-") + index + "}{" + token + "}";
      });
      if (!occurrences.length) return;
      if (annotated.includes(R(",@qquad ")) && original.includes(R("@Omega(f)"))) {
        annotated = R("@begin{gathered}") + annotated.replace(R(",@qquad "),R("@@[.6em]")) + R("@end{gathered}");
      }
      let box = display.closest(".formula-box");
      if (!box) {
        box = document.createElement("div");
        box.className = "formula-box";
        const paragraph = display.parentElement;
        if (paragraph.tagName === "P" && paragraph.textContent.trim() === display.textContent.trim()) {
          paragraph.replaceWith(box);
        } else {
          display.before(box);
        }
        box.appendChild(display);
      }
      box.dataset.originalMath = original;
      if (!box.dataset.formulaName) {
        const heading = box.closest(".lesson-detail-card")?.querySelector("h2,h3");
        box.dataset.formulaName = heading?.textContent || "当前公式";
      }
      // Only our fixed class names may pass KaTeX's HTML extension.
      try {
        window.katex.render(R("@displaystyle ") + annotated,display,{
          displayMode:false,throwOnError:true,strict:"ignore",
          trust:ctx => ctx.command === R("@htmlClass") && /^formula-target formula-token-\d+$/.test(ctx.class)
        });
      } catch (_) {
        plainRender(original,display,true);
        return;
      }
      display.querySelectorAll(".katex-html").forEach(node => node.removeAttribute("aria-hidden"));
      display.querySelectorAll(".katex-mathml").forEach(node => node.setAttribute("aria-hidden","true"));
      box.setAttribute("role","group");
      box.setAttribute("aria-label",box.dataset.formulaName + "，蓝色部分可打开解释");
      display.querySelectorAll(".formula-target").forEach(node => {
        const index = Number(Array.from(node.classList).find(c=>c.startsWith("formula-token-")).slice(14));
        const occurrence = occurrences[index];
        node.dataset.term = occurrence.term;
        node.dataset.math = occurrence.math;
        node.tabIndex = 0;
        node.setAttribute("role","button");
        node.setAttribute("aria-label","解释：" + terms[occurrence.term][0]);
        node.setAttribute("aria-haspopup","dialog");
        node.setAttribute("aria-controls",dialog.id);
      });
      const hint = document.createElement("p");
      hint.className = "formula-trigger-hint";
      hint.textContent = "点蓝色下划线看解释 · 键盘可用 Tab 选择、Enter 打开";
      box.after(hint);
      const allParts = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "逐项解释 / 点这里选择一个部分";
      allParts.appendChild(summary);
      const parts = document.createElement("div");
      parts.className = "formula-parts";
      const seen = new Set();
      occurrences.forEach(({term,math}) => {
        if (!seen.has(term)) { parts.appendChild(makePart(term,math,box)); seen.add(term); }
      });
      if (original.includes(R("@Omega"))) ["lossGroup","newPrediction","l2Penalty"].forEach(id=>parts.appendChild(makePart(id,groupMath[id],box)));
      if (!profile && !isTree && original.includes("Gain")) parts.appendChild(makePart("gainParts",groupMath.gainParts,box));
      allParts.appendChild(parts);
      hint.after(allParts);
    });
  }
  interactiveMath();
})();
