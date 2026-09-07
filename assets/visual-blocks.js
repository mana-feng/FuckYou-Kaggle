/* 把误用为代码块的流程、步骤、结构树和要点，转成可阅读的语义化图块。 */
(function () {
  "use strict";

  function addStyles() {
    var style = document.createElement("style");
    style.textContent = ".visual-block{margin:1.35em 0;padding:15px 16px;border:1px solid var(--border,#d9e0ea);border-radius:13px;background:var(--card,#fff);box-shadow:var(--shadow,0 5px 16px rgba(30,45,70,.08));color:var(--fg,#172033)}.visual-block-title{margin:0 0 11px;color:var(--accent,#b65310);font-size:.88em;font-weight:800;letter-spacing:.04em}.vb-flow{display:grid;gap:9px}.vb-flow-row{display:flex;align-items:center;flex-wrap:wrap;gap:7px}.vb-flow-step{padding:7px 10px;border:1px solid var(--border,#d9e0ea);border-radius:8px;background:var(--quote-bg,#f4f7fb);font-weight:650;line-height:1.5}.vb-flow-arrow,.vb-flow-down{color:var(--accent,#b65310);font-weight:800;font-size:1.1em}.vb-flow-down{text-align:center;line-height:1}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow{gap:0}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-row{display:grid;grid-template-columns:minmax(128px,.9fr) 22px minmax(180px,1.45fr);gap:10px;align-items:start;padding:10px 0;border-top:1px solid var(--border,#d9e0ea)}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-row:first-child{border-top:0;padding-top:0}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-step{padding:0;border:0;border-radius:0;background:transparent;font-weight:650}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-step:only-child{grid-column:1/-1;color:var(--muted,#536174);font-weight:500}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-arrow{justify-self:center;padding-top:1px}.vb-steps,.vb-list{margin:0;padding-left:1.45em}.vb-steps li,.vb-list li{margin:.48em 0;padding-left:.25em;line-height:1.72}.vb-steps li::marker{font-weight:800;color:var(--accent,#b65310)}.vb-tree-flow{display:grid;gap:7px;max-width:680px;margin:auto}.vb-tree-row{position:relative;display:grid;grid-template-columns:minmax(150px,1fr) minmax(190px,1.3fr);gap:10px;align-items:center;padding:9px 11px;background:var(--quote-bg,#f4f7fb);border:1px solid var(--border,#d9e0ea);border-radius:9px}.vb-tree-row:not(:last-child)::after{content:\"↓\";position:absolute;left:50%;bottom:-17px;z-index:1;color:var(--accent,#b65310);font-weight:800}.vb-tree-node{font-weight:750;line-height:1.55}.vb-tree-note{color:var(--muted,#536174);line-height:1.55}.vb-note{margin:0;line-height:1.78}.vb-note p,.vb-calc p,.vb-compare p{margin:.48em 0;line-height:1.72}.vb-calc{display:grid;gap:8px}.vb-calc p{margin:0;padding:9px 11px;border-left:3px solid var(--accent,#b65310);background:var(--accent-soft,#fff1e7);border-radius:0 8px 8px 0;font-weight:650}.vb-compare{display:grid;gap:7px}.vb-compare p{margin:0;padding:9px 11px;background:var(--quote-bg,#f4f7fb);border-radius:8px;border:1px solid var(--border,#d9e0ea)}figure.dia svg text[font-size=\"8.5\"],figure.dia svg text[font-size=\"9.5\"],figure.dia svg text[font-size=\"10\"],figure.dia svg text[font-size=\"10.0\"],figure.dia svg text[font-size=\"10.5\"]{font-size:11px!important}@media(max-width:640px){.visual-block{padding:13px}.vb-flow-row{align-items:stretch;flex-direction:column;gap:4px}.vb-flow-step{text-align:left}.vb-flow-arrow{align-self:center;transform:rotate(90deg)}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-row{grid-template-columns:1fr;gap:5px}.visual-block-flow[aria-label=\"信息关系\"] .vb-flow-arrow{justify-self:start;transform:rotate(90deg);margin-left:7px}.vb-tree-row{grid-template-columns:1fr;gap:3px}}";
    document.head.appendChild(style);
    var causalStyle = document.createElement("style");
    causalStyle.textContent = ".visual-block-flow[aria-label=\"因果链\"] .vb-flow{gap:0}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-row{display:grid;grid-template-columns:minmax(112px,.8fr) 22px minmax(150px,1.2fr) 22px minmax(112px,.8fr);gap:10px;align-items:start;padding:10px 0;border-top:1px solid var(--border,#d9e0ea)}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-row:first-child{border-top:0;padding-top:0}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-step{padding:0;border:0;border-radius:0;background:transparent;font-weight:700}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-step:only-child{grid-column:1/-1;color:var(--muted,#536174);font-weight:500}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-arrow{justify-self:center;padding-top:1px}@media(max-width:640px){.visual-block-flow[aria-label=\"因果链\"] .vb-flow-row{grid-template-columns:1fr;gap:5px}.visual-block-flow[aria-label=\"因果链\"] .vb-flow-arrow{justify-self:start;transform:rotate(90deg);margin-left:7px}}";
    document.head.appendChild(causalStyle);
    var calculationStyle = document.createElement("style");
    calculationStyle.textContent = ".visual-block-calc{padding:18px 20px;border-left:4px solid var(--accent,#b65310);box-shadow:none}.visual-block-calc .vb-calc{display:block;border-top:1px solid var(--border,#d9e0ea)}.visual-block-calc .vb-calc p{margin:0;padding:10px 0 10px 13px;border:0;border-left:2px solid var(--border,#d9e0ea);border-bottom:1px solid var(--border,#d9e0ea);border-radius:0;background:transparent;font-weight:600;line-height:1.7;font-variant-numeric:tabular-nums}.visual-block-calc .vb-calc p:first-child{padding:11px 0;border-left:0;color:var(--fg,#172033);font-size:1.06em;font-weight:800}.visual-block-calc .vb-calc p:last-child{border-bottom:0}@media(max-width:640px){.visual-block-calc{padding:15px 16px}.visual-block-calc .vb-calc p{padding-left:10px;font-size:.96em}}";
    document.head.appendChild(calculationStyle);
    var rowStyle = document.createElement("style");
    rowStyle.textContent = ".visual-block-flow[aria-label=\"流程图\"] .vb-flow,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow{gap:0}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-row,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-row,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-row,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-row{align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid var(--border,#d9e0ea)}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-row:first-child,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-row:first-child,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-row:first-child,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-row:first-child{border-top:0;padding-top:0}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-step,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-step,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-step,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-step{padding:0;border:0;border-radius:0;background:transparent;font-weight:650;line-height:1.7}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-step:only-child,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-step:only-child,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-step:only-child,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-step:only-child{color:var(--fg,#172033)}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-arrow{padding-top:4px}.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow{counter-reset:step}.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-row::before{counter-increment:step;content:counter(step);display:inline-grid;place-items:center;flex:0 0 24px;width:24px;height:24px;margin-top:2px;border-radius:50%;background:var(--accent-soft,#fff1e7);color:var(--accent,#b65310);font-size:.82em;font-weight:800}@media(max-width:640px){.visual-block-flow[aria-label=\"流程图\"] .vb-flow-row,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-row,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-row,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-row{flex-direction:column;gap:5px}.visual-block-flow[aria-label=\"流程图\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"结果对照\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"关键信息\"] .vb-flow-arrow,.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-arrow{align-self:flex-start;transform:rotate(90deg);margin-left:7px}.visual-block-flow[aria-label=\"操作步骤\"] .vb-flow-row::before{margin-bottom:2px}}";
    document.head.appendChild(rowStyle);
    var compareStyle = document.createElement("style");
    compareStyle.textContent = ".visual-block-compare{padding:18px 20px;border-left:4px solid var(--accent,#b65310);box-shadow:none}.visual-block-compare .vb-compare{display:block;border-top:1px solid var(--border,#d9e0ea)}.visual-block-compare .vb-compare p{margin:0;padding:10px 0 10px 13px;border:0;border-left:2px solid var(--border,#d9e0ea);border-bottom:1px solid var(--border,#d9e0ea);border-radius:0;background:transparent;line-height:1.7}.visual-block-compare .vb-compare p:first-child{padding-top:11px;border-left:0;font-weight:800}.visual-block-compare .vb-compare p:last-child{border-bottom:0}@media(max-width:640px){.visual-block-compare{padding:15px 16px}.visual-block-compare .vb-compare p{padding-left:10px;font-size:.96em}}";
    document.head.appendChild(compareStyle);
    var structureStyle = document.createElement("style");
    structureStyle.textContent = ".visual-block-tree{padding:18px 20px;border-left:4px solid var(--accent,#b65310);box-shadow:none}.visual-block-tree .vb-tree-flow{position:relative;max-width:760px;margin:0;padding-left:27px;gap:0}.visual-block-tree .vb-tree-row{position:relative;grid-template-columns:minmax(120px,.8fr) minmax(0,1.5fr);gap:12px;padding:0 0 15px;background:transparent;border:0;border-radius:0}.visual-block-tree .vb-tree-row::before{content:\"\";position:absolute;left:-23px;top:5px;width:10px;height:10px;border:2px solid var(--accent,#b65310);border-radius:50%;background:var(--card,#fff);box-sizing:border-box}.visual-block-tree .vb-tree-row:not(:last-child)::after{content:\"\";position:absolute;left:-19px;top:17px;bottom:0;width:1px;height:auto;background:var(--border,#d9e0ea);z-index:0}.visual-block-tree .vb-tree-node,.visual-block-tree .vb-tree-note{position:relative;z-index:1}.visual-block-tree .vb-tree-note{padding-left:12px;border-left:2px solid var(--border,#d9e0ea)}@media(max-width:640px){.visual-block-tree{padding:15px 16px}.visual-block-tree .vb-tree-row{grid-template-columns:1fr;gap:4px;padding-bottom:16px}.visual-block-tree .vb-tree-note{padding-left:0;border-left:0}}.table-scroll{width:100%;max-width:100%;overflow-x:auto;margin:1.2em 0;border:1px solid var(--border,#d9e0ea);border-radius:10px;-webkit-overflow-scrolling:touch}.table-scroll table{display:table;width:100%;min-width:max-content;max-width:none;margin:0;border:0}.table-scroll th,.table-scroll td{white-space:normal}.table-scroll table tr:first-child th{border-top:0}.table-scroll table tr:last-child td{border-bottom:0}.table-scroll table th:first-child,.table-scroll table td:first-child{border-left:0}.table-scroll table th:last-child,.table-scroll table td:last-child{border-right:0}@media(max-width:640px){.table-scroll{border-radius:8px}.table-scroll th,.table-scroll td{padding:7px 10px;font-size:.95em}}";
    document.head.appendChild(structureStyle);
    var resultStyle = document.createElement("style");
    resultStyle.textContent = ".result-board{margin:1.55em 0;padding:0 0 2px 16px;border-left:4px solid var(--accent,#b65310)}.result-board-title{margin:0.2em 0 0.55em;color:var(--fg,#172033);font-weight:800;line-height:1.55}.result-board-title:not(:first-child){margin-top:1.65em;padding-top:1em;border-top:1px solid var(--border,#d9e0ea)}.result-board-takeaway{margin:0.75em 0 0;color:var(--muted,#536174);font-weight:650;line-height:1.7}.result-board .table-scroll{margin:0.6em 0 0.85em}.result-board caption{caption-side:top;padding:9px 11px;text-align:left;color:var(--muted,#536174);font-size:.92em;line-height:1.55;background:var(--quote-bg,#f4f7fb);border-bottom:1px solid var(--border,#d9e0ea)}@media(max-width:640px){.result-board{padding-left:12px}.result-board-title:not(:first-child){margin-top:1.35em}}";
    document.head.appendChild(resultStyle);
    var diagramMobileStyle = document.createElement("style");
    diagramMobileStyle.textContent = "@media(max-width:640px){figure.dia{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:0 0 8px;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}figure.dia::before{content:\"图较宽，可左右滑动查看完整内容\";display:block;width:max-content;margin:0 0 8px;padding:4px 8px;border-radius:999px;color:var(--muted,#536174);font-size:.82em;background:var(--quote-bg,#f4f7fb);letter-spacing:.01em}figure.dia svg{width:800px;min-width:800px;max-width:none;margin:0}}";
    document.head.appendChild(diagramMobileStyle);
  }

  function isClearlyCode(text, code) {
    if (/(?:^|\s)language-[\w-]+/.test(code.className)) return true;
    // Pygments 为真正代码加的 token span；纯文字围栏只有 pre 里的空行号 span。
    if (code.querySelector && code.querySelector("span[class]")) return true;
    return /(^|\n)\s*(?:import |from |def |class |function |const |let |var |if\s*\(|for\s*\(|while\s*\(|return\b|try:|except\b|SELECT\b|INSERT\b|UPDATE\b|DELETE\b|CREATE\b|ALTER\b|WITH\b|#include|pip |python |npm |git )|=>|\{[\s\S]*\}|;\s*(?:\n|$)/mi.test(text);
  }

  function classify(text, code) {
    if (isClearlyCode(text, code)) return null;
    if (/(?:≈|=).*(?:MB|GB|TB|token|字节|倍|%|ms|秒|分钟|层|头|bit)/.test(text)) return "calc";
    if (/[├└│┌┐┘┬]/.test(text)) return "tree";
    var arrows = (text.match(/[→↓]|(?:^|\s)->(?:\s|$)/gm) || []).length;
    var isProcess = arrows >= 2 && /第[一二三四五六七八九十]|[①②③④⑤⑥⑦⑧⑨⑩]|先(?:把|是|做|从)|然后|接着|随后|最后|依次|阶段|过程|循环|开始|结束|下一步|逐步|每次/.test(text);
    if (isProcess) return "flow";
    if (/因为|所以|导致|一旦|于是|从而|使得|意味着|等于|若.*则|如果.*就|结果是/.test(text)) return "causal";
    if (arrows) return "relation";
    if (/(?:^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩]/.test(text)) return "steps";
    if (/(?:^|\n)\s*[·•]/.test(text)) return "list";
    if (text.split(/\r?\n/).filter(function (line) { return /\s{2,}/.test(line); }).length >= 2) return "compare";
    return /[\u4e00-\u9fff]/.test(text) ? "note" : null;
  }

  function meaningfulLines(text) {
    return text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function makeFlow(text) {
    var flow = document.createElement("div");
    flow.className = "vb-flow";
    meaningfulLines(text).forEach(function (line) {
      if (/^↓+$/.test(line)) {
        var down = document.createElement("div");
        down.className = "vb-flow-down";
        down.textContent = "↓";
        flow.appendChild(down);
        return;
      }
      var row = document.createElement("div");
      row.className = "vb-flow-row";
      if (/^(?:→|->)/.test(line)) { var leading = document.createElement("span"); leading.className = "vb-flow-arrow"; leading.textContent = "→"; row.appendChild(leading); }
      line.split(/\s*(?:→|->|↓)\s*/).filter(Boolean).forEach(function (part, index) {
        if (index) { var arrow = document.createElement("span"); arrow.className = "vb-flow-arrow"; arrow.textContent = "→"; row.appendChild(arrow); }
        var step = document.createElement("span");
        step.className = "vb-flow-step";
        step.textContent = part.replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "");
        row.appendChild(step);
      });
      flow.appendChild(row);
    });
    return flow;
  }

  function makeList(text, ordered) {
    var list = document.createElement(ordered ? "ol" : "ul");
    list.className = ordered ? "vb-steps" : "vb-list";
    meaningfulLines(text).forEach(function (line) {
      var item = document.createElement("li");
      item.textContent = line.replace(/^\s*(?:[①②③④⑤⑥⑦⑧⑨⑩]|[·•])\s*/, "");
      list.appendChild(item);
    });
    return list;
  }

  function makeLines(text, className) {
    var box = document.createElement("div");
    box.className = className;
    meaningfulLines(text).forEach(function (line) {
      var row = document.createElement("p");
      row.textContent = line;
      box.appendChild(row);
    });
    return box;
  }

  function makeTree(text) {
    var tree = document.createElement("div");
    tree.className = "vb-tree-flow";
    meaningfulLines(text).forEach(function (line) {
      line = line.replace(/[│├└┌┐┘┬─▼◄►╱╲]/g, " ").replace(/\s+/g, " ").replace(/^\s*[- ]+|[- ]+\s*$/g, "");
      if (!line) return;
      var parts = line.split("←");
      var row = document.createElement("div");
      row.className = "vb-tree-row";
      var node = document.createElement("span");
      node.className = "vb-tree-node";
      node.textContent = parts.shift().trim();
      row.appendChild(node);
      if (parts.length) {
        var note = document.createElement("span");
        note.className = "vb-tree-note";
        note.textContent = parts.join("←").trim();
        row.appendChild(note);
      }
      tree.appendChild(row);
    });
    return tree;
  }

  function pretrainingModelTree(text) {
    if (!/^是否中文任务？\s*[\s\S]*ERNIE\s*\/\s*MacBERT[\s\S]*DeBERTa V3 XLarge/.test(text)) return null;
    var figure = document.createElement("figure");
    figure.className = "dia";
    figure.setAttribute("aria-label", "预训练模型选型决策树");
    figure.innerHTML =
      '<svg viewBox="0 0 800 430" role="img" aria-labelledby="model-tree-title model-tree-desc">' +
      '<title id="model-tree-title">预训练模型选型决策树</title>' +
      '<desc id="model-tree-desc">先判断是否中文任务；中文任务再判断是否需要知识增强，非中文任务再判断是否追求极致性能。</desc>' +
      '<g fill="none" stroke="var(--border,#d9e0ea)" stroke-width="2"><path d="M400 82V110H195V135"/><path d="M400 110H605V135"/><path d="M195 187V222H110V252"/><path d="M195 222H300V252"/><path d="M605 187V222H500V252"/><path d="M605 222H690V252"/></g>' +
      '<g fill="var(--accent,#b65310)" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="13" font-weight="700"><text x="280" y="106">是</text><text x="505" y="106">否</text><text x="135" y="218">是</text><text x="245" y="218">否</text><text x="530" y="218">是</text><text x="640" y="218">否</text></g>' +
      '<g class="dia-t" fill="var(--card,#fff)" stroke="var(--accent,#b65310)" stroke-width="2"><rect x="310" y="30" width="180" height="52" rx="12"/><rect x="105" y="135" width="180" height="52" rx="12"/><rect x="515" y="135" width="180" height="52" rx="12"/></g>' +
      '<g class="dia-t" fill="var(--quote-bg,#f4f7fb)" stroke="var(--border,#d9e0ea)" stroke-width="1.5"><rect x="28" y="252" width="164" height="86" rx="12"/><rect x="218" y="252" width="164" height="86" rx="12"/><rect x="418" y="252" width="164" height="86" rx="12"/><rect x="608" y="252" width="164" height="86" rx="12"/></g>' +
      '<g class="dia-t" fill="var(--fg,#172033)" font-family="PingFang SC,Microsoft YaHei,sans-serif" text-anchor="middle"><text x="400" y="62" font-size="17" font-weight="800">是否中文任务？</text><text x="195" y="167" font-size="16" font-weight="800">需要知识增强？</text><text x="605" y="167" font-size="16" font-weight="800">追求极致性能？</text><text x="110" y="286" font-size="16" font-weight="800">ERNIE</text><text x="110" y="312" font-size="14">或 MacBERT</text><text x="300" y="284" font-size="15" font-weight="800">RoBERTa-wwm-ext</text><text x="300" y="312" font-size="14">或 DeBERTa-v3</text><text x="500" y="286" font-size="15" font-weight="800">DeBERTa V3</text><text x="500" y="312" font-size="14">XLarge</text><text x="690" y="286" font-size="15" font-weight="800">RoBERTa Base</text><text x="690" y="312" font-size="14">→ BERT Base</text></g>' +
      '<text x="400" y="392" class="dia-t" fill="var(--muted,#536174)" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="14" text-anchor="middle">先按语言与任务约束筛选，再在候选中比较数据规模、显存和验证集结果。</text>' +
      '</svg><figcaption>先看顶端的语言分支；每次只回答一个问题，沿着“是 / 否”走到一个起始候选。</figcaption>';
    return figure;
  }

  function specializedDiagram(text) {
    return pretrainingModelTree(text);
  }

  function legacyDecisionGuide(text) {
    if (!document.body.hasAttribute("data-legacy-decision-guides")) return null;
    var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); });
    var choices = lines.filter(function (line) { return /^(?:\+--|\|--|\\--)/.test(line); })
      .map(function (line) { return line.replace(/^(?:\+--|\|--|\\--)\s*/, ""); });
    if (choices.length < 2) return null;

    var block = document.createElement("section");
    block.className = "visual-block visual-block-compare";
    block.setAttribute("aria-label", "策略清单");
    var title = document.createElement("p");
    title.className = "visual-block-title";
    title.textContent = "策略清单";
    block.appendChild(title);
    var lead = document.createElement("p");
    lead.className = "vb-note";
    lead.textContent = "读法：每一行都是“遇到什么情况，再加什么做法”；它们可以组合，不是只能沿一条分支走到底。";
    block.appendChild(lead);
    var rows = document.createElement("div");
    rows.className = "vb-compare";
    choices.forEach(function (choice) {
      var row = document.createElement("p");
      var colon = choice.indexOf(":");
      if (colon > 0) {
        var label = document.createElement("strong");
        label.textContent = choice.slice(0, colon);
        row.appendChild(label);
        row.appendChild(document.createTextNode("：" + choice.slice(colon + 1).trim()));
      } else {
        row.textContent = choice;
      }
      rows.appendChild(row);
    });
    block.appendChild(rows);
    return block;
  }

  function legacyProjectOutline(text) {
    if (!document.body.hasAttribute("data-legacy-project-outline")) return null;
    var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); });
    if (!/^project\/$/.test(lines[0] || "")) return null;
    var files = lines.filter(function (line) { return /^\|--\s+/.test(line); })
      .map(function (line) { return line.replace(/^\|--\s+/, ""); });
    if (files.length < 2) return null;

    var block = document.createElement("section");
    block.className = "visual-block visual-block-compare";
    block.setAttribute("aria-label", "项目文件分工");
    var title = document.createElement("p");
    title.className = "visual-block-title";
    title.textContent = "项目文件分工";
    block.appendChild(title);
    var rows = document.createElement("div");
    rows.className = "vb-compare";
    files.forEach(function (file) {
      var row = document.createElement("p");
      var parts = file.split(/\s+#\s*/, 2);
      var name = document.createElement("code");
      name.textContent = parts[0];
      row.appendChild(name);
      if (parts[1]) row.appendChild(document.createTextNode("：" + parts[1]));
      rows.appendChild(row);
    });
    block.appendChild(rows);
    return block;
  }

  function transform(code) {
    var pre = code.parentElement;
    var host = pre && pre.parentElement && pre.parentElement.classList.contains("codehilite") ? pre.parentElement : pre;
    if (!pre || !host || host.dataset.visualBlock === "done") return false;
    var text = code.textContent.trim();
    var legacy = legacyDecisionGuide(text) || legacyProjectOutline(text);
    if (legacy) {
      host.dataset.visualBlock = "done";
      host.replaceWith(legacy);
      return true;
    }
    var diagram = specializedDiagram(text);
    if (diagram) {
      host.dataset.visualBlock = "done";
      host.replaceWith(diagram);
      return true;
    }
    var kind = classify(text, code);
    if (!kind) return false;

    host.dataset.visualBlock = "done";
    var block = document.createElement("section");
    block.className = "visual-block visual-block-" + kind;
    block.setAttribute("aria-label", kind === "flow" ? "流程图" : kind === "relation" ? "信息关系" : kind === "causal" ? "因果链" : kind === "tree" ? "结构图" : kind === "steps" ? "操作步骤" : kind === "calc" ? "计算说明" : kind === "compare" ? "对照说明" : "要点说明");
    var title = document.createElement("p");
    title.className = "visual-block-title";
    title.textContent = kind === "flow" ? "流程图" : kind === "relation" ? "信息关系" : kind === "causal" ? "因果链" : kind === "tree" ? "结构" : kind === "steps" ? "步骤" : kind === "calc" ? "算一算" : kind === "compare" ? "对照" : "要点";
    block.appendChild(title);

    if (kind === "flow" || kind === "relation") block.appendChild(makeFlow(text));
    else if (kind === "tree") block.appendChild(makeTree(text));
    else if (kind === "calc") block.appendChild(makeLines(text, "vb-calc"));
    else if (kind === "compare") block.appendChild(makeLines(text, "vb-compare"));
    else if (kind === "causal") block.appendChild(makeLines(text, "vb-compare"));
    else if (kind === "note") block.appendChild(makeLines(text, "vb-note"));
    else block.appendChild(makeList(text, kind === "steps"));

    host.replaceWith(block);
    return true;
  }

  function wrapTables(root) {
    Array.prototype.forEach.call(root.querySelectorAll("table"), function (table, index) {
      var wrap = table.parentElement;
      if (!wrap || !wrap.classList.contains("table-scroll")) {
        wrap = document.createElement("div");
        wrap.className = "table-scroll";
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      }
      if (wrap.dataset.readingScrollHint) return;
      var hint = document.createElement("p");
      hint.id = "reading-table-scroll-hint-" + index;
      hint.className = "table-scroll-hint";
      hint.textContent = "表格较宽，可左右滑动查看完整内容。";
      hint.hidden = true;
      wrap.before(hint);
      wrap.dataset.readingScrollHint = hint.id;
      function updateHint() {
        var wide = wrap.scrollWidth > wrap.clientWidth + 1;
        hint.hidden = !wide;
        wrap.tabIndex = wide ? 0 : -1;
        if (wide) {
          wrap.setAttribute("role", "region");
          wrap.setAttribute("aria-label", "可横向滚动的表格");
          wrap.setAttribute("aria-describedby", hint.id);
        } else {
          wrap.removeAttribute("role");
          wrap.removeAttribute("aria-label");
          wrap.removeAttribute("aria-describedby");
        }
      }
      if (typeof ResizeObserver === "function") {
        var observer = new ResizeObserver(updateHint);
        observer.observe(wrap); observer.observe(table);
      } else window.addEventListener("resize", updateHint);
      if (document.fonts) document.fonts.ready.then(updateHint);
      updateHint();
    });
  }

  function splitLongBlogProse(root) {
    var tag = root.querySelector(".srcbox .tag");
    if (!tag || tag.textContent.indexOf("Claude 官方博客") < 0) return;
    var style = document.createElement("style");
    style.textContent = ".blog-prose-split .prose-beat{display:block;height:.72em;content:\"\"}";
    document.head.appendChild(style);
    Array.prototype.forEach.call(root.querySelectorAll("p"), function (p) {
      if (p.closest(".srcbox,.adhd-head,.recap,.ckpt,.donebar,.pagenav,blockquote,details,pre,table") ||
          p.textContent.replace(/\s/g, "").length <= 200) return;
      var nodes = [];
      var walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) nodes.push(walker.currentNode);
      var breaks = 0;
      nodes.forEach(function (node) {
        if (node.parentElement && node.parentElement.closest("code,a")) return;
        var parts = node.nodeValue.split(/([。！？])/);
        if (parts.length < 3) return;
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < parts.length; i += 2) {
          var sentence = (parts[i] || "") + (parts[i + 1] || "");
          if (!sentence) continue;
          fragment.appendChild(document.createTextNode(sentence));
          if (i + 2 < parts.length) {
            var beat = document.createElement("br");
            beat.className = "prose-beat";
            fragment.appendChild(beat);
            breaks += 1;
          }
        }
        node.parentNode.replaceChild(fragment, node);
      });
      if (breaks) p.classList.add("blog-prose-split");
    });
  }

  function run() {
    addStyles();
    var root = document.querySelector("main") || document.body;
    Array.prototype.forEach.call(root.querySelectorAll("pre > code"), transform);
    wrapTables(root);
    splitLongBlogProse(root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
