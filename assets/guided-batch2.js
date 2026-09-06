/* Exact TeX fragments, with explanations scoped to each lesson. */
(function () {
  "use strict";
  const tex = s => s.replaceAll("@", String.fromCharCode(92));
  const entries = {
    "04a": [
      ["F_t(x)", "更新后的整体预测", "前面所有树加上这棵新树后，对输入 x 的预测。", "它是公式左侧的结果，不是第 t 棵树单独的输出。", "旧预测 3，加上缩小后的修正 0.1，结果为 3.1。"],
      ["F_{t-1}(x)", "加入新树之前的预测", "前 t−1 轮累积的预测。", "这一轮从它出发改进，不重新从零预测。", "本例更新前预测为 3。"],
      ["@eta", "学习率 η", "控制每棵新树的贡献占多少。", "乘在新树输出前，使每次更新更小；较小并不保证最终更好。", "η=0.1，新树输出 1，实际只加 0.1。"],
      ["f_t(x)", "第 t 棵树的修正量", "新树对当前输入的输出。", "一般 GBDT 拟合负梯度方向；平方损失下可理解为拟合残差。实际更新还要乘学习率。", "新树建议加 1，并不表示最终预测就是 1。"]
    ],
    "07": [
      ["@mathbf{a}^{(l-1)}", "上一层的输出", "这一层接收到的输入向量。", "先与当前层的权重矩阵相乘，再加偏置。第一层的输入通常来自原始特征。", "上一层有 3 个单元，这个向量就有 3 个分量。"],
      ["@mathbf{a}^{(l)}", "当前层的输出", "线性变换经过激活后的结果。", "它交给下一层，作为下一层的输入。", "当前层有 4 个单元，输出向量就有 4 个分量。"],
      ["W^{(l)}", "当前层的权重矩阵", "把上一层各分量加权组合成当前层的输入。", "这些参数由训练更新。它只能完成线性组合，非线性由外面的激活引入。", "从 3 维到 4 维，按这里的列向量约定，W 的形状为 4×3。"],
      ["@mathbf{b}^{(l)}", "偏置向量", "每个输出单元的可训练偏移量。", "在激活前加到加权和上，让变换不必经过原点。", "4 个输出单元对应 4 个偏置。"],
      ["f", "激活函数 f", "对括号内的值施加非线性变换。", "没有非线性，多层仿射变换仍可合成一层。这里的 f 不是 GBDT 中的一棵树。", "若 f 是 ReLU：输入 −2 得到 0，输入 3 得到 3。"]
    ],
    "09": [
      ["w_{@mathrm{new}}", "更新后的参数", "做完这一步梯度下降后得到的值。", "优化器根据梯度与步长计算它；反向传播只负责先提供梯度。", "1−0.1×2=0.8。"],
      ["@eta", "学习率 η", "把梯度换算为实际更新幅度的系数。", "本式是普通梯度下降，减去学习率与梯度的乘积。", "梯度 2，η=0.1，就从参数中减去 0.2。"],
      ["g_t", "当前梯度 gₜ", "当前参数位置上，损失对参数的一阶导数或小批量估计。", "普通梯度下降直接使用它；Adam 还用它更新历史统计。它不是参数本身。", "标量梯度为正时，足够小的负梯度更新会让参数减小。"],
      ["@hat m_t", "偏差修正后的一阶动量", "对历史梯度的指数平均做初始化偏差修正。", "在 Adam 更新的分子里提供方向；除以 1−β₁ᵗ 来抵消从零初始化的影响。", "第一步 m₁=0.1g₁、β₁=0.9，修正后 m̂₁=g₁。"],
      ["@hat v_t", "偏差修正后的二阶原始矩", "梯度平方的指数平均经过初始化偏差修正后的值。", "用于分母的尺度调整。这里的“二阶”不是 Hessian，也不是损失的二阶导数。", "梯度平方较大的坐标，其分母通常也较大。"],
      ["m_t", "一阶动量 mₜ", "当前梯度与之前动量的指数加权平均。", "累积较稳定的方向，减轻逐步梯度的抖动；初始化为零时需要偏差修正。", "β₁=0.9 时，旧动量占 90%，新梯度占 10%。"],
      ["v_t", "二阶原始矩 vₜ", "梯度平方的指数加权平均。", "估计各坐标的梯度尺度，不是求二阶导。平方在这里按元素计算。", "梯度为 −2，其平方贡献是 4。"],
      ["@beta_1", "β₁：一阶记忆比例", "控制旧梯度平均保留多少。", "越接近 1，更新一阶动量时保留的历史越多。", "β₁=0.9，当前梯度的权重是 0.1。"],
      ["@beta_2", "β₂：平方梯度的记忆比例", "控制旧平方梯度平均保留多少。", "用于 v 的平滑，与 β₁ 分别控制不同统计。", "β₂=0.999，当前梯度平方的权重是 0.001。"],
      ["@varepsilon", "ε：分母的稳定项", "一个小的正数。", "加在 Adam 分母上，避免尺度接近零时数值不稳定。", "即使 v̂ 为 0，分母也不会恰好为 0。"],
      ["@frac{@sigma^2}{B}", "平均梯度的方差", "在样本梯度独立且同方差的假设下，平均值方差是单样本方差除以 B。", "说明增大批量如何减小估计噪声；不能单靠它推出学习率线性缩放。", "B 翻倍时，方差减半，标准差变为原来的 1/√2。"]
    ],
    "12": [
      ["H_{out}", "输出高度", "卷积后在竖直方向得到多少个位置。", "左侧是待计算的尺寸；这条简化公式假设 dilation=1。", "输入 32、核 3、padding 1、stride 2，输出 16。"],
      ["H_{in}", "输入高度", "进入这一层前的竖直方向格数。", "先加上上下两侧的 padding，再扣掉卷积核占用的长度。", "输入为 32×32 图像时，高度是 32。"],
      ["2p", "两侧填充共 2p", "上、下各补 p 个位置，所以一共加 2p。", "让边界附近也能参与窗口计算，并影响输出尺寸。", "p=1，就给高度加 2。"],
      ["@frac{H_{in}+2p-k}{s}", "窗口可以移动多少步", "填充后长度减去核大小，再除以步幅。", "向下取整后再加 1，把起始窗口本身也算进去；有 dilation 时需使用有效核大小。", "(32+2−3)/2=15.5，取整 15，再加 1 得 16。"],
      ["@frac{H_{in} + 2p - k}{s}", "窗口可以移动多少步", "填充后长度减去核大小，再除以步幅。", "向下取整后再加 1；本式限定 dilation=1。", "(32+2−3)/2=15.5，取整再加 1 得 16。"]
    ],
    "13": [
      ["h_{t-1}", "上一时刻的隐藏状态", "前面输入留下的压缩表示。", "通过 W_h 影响当前状态，使 RNN 不只看当前输入。", "读到“好”时，前面的“不”可能已影响这个状态。"],
      ["h_t", "当前隐藏状态", "把新输入和旧状态融合后的表示。", "会传给下一时刻，也可以交给输出层；它不是必然等于最终分类结果。", "情感分类可以在序列末尾把隐藏状态送入分类层。"],
      ["@tanh", "tanh 激活", "把各分量压到 −1 与 1 之间的非线性函数。", "这里作用于当前输入和旧状态的加权和。它是一种简单 RNN 写法，不代表所有序列网络都使用 tanh。", "tanh(0)=0；输入很大时输出接近 1。"],
      ["W_x x_t", "当前输入提供的信息", "把时刻 t 的输入向量变换到状态空间。", "这部分负责新信息，与历史状态的贡献相加。", "本时刻输入可为“好”的词向量。"],
      ["W_h", "历史状态的权重", "把旧状态映射到当前状态空间的矩阵。", "同一组 RNN 权重在各时刻复用，不是每个词换一套参数。", "所有时刻使用同一个 W_h，但 h 的数值会改变。"]
    ],
    "14": [
      ["QK^@top", "查询与键的匹配分数", "每个查询与各位置键向量做点积。", "决定后面如何分配注意力；这是原始分数，还不是归一化权重。", "若查询更匹配第一个键，它的原始分数可能更高。"],
      ["@sqrt{d_k}", "每个头的维度尺度", "键与查询在单个注意力头里的维度 d_k 的平方根。", "缩放点积分数，缓解维度增大带来的尺度问题。不是总模型维度的平方根。", "单头维度为 64，就除以 8。"],
      ["@operatorname{softmax}", "Softmax：分数转为权重", "沿键位置方向，将分数转为非负且和为 1 的权重。", "这些权重用来混合 V 的各位置内容。因果场景还要先遮住未来位置。", "两位置权重为 0.8、0.2 时，总和为 1。"],
      ["@operatorname{Attention}(Q,K,V)", "注意力的输出", "按查询相关度加权混合值向量的结果。", "Q 负责查询，K 用来匹配，V 提供内容；左侧是混合后的表示。此简式没有展开掩码和多头拼接。", "权重 0.8、0.2，内容 10、0，混合为 8。"]
    ]
  };
  const keys = ["00","01","02","04a","05","06","07","09","10","11","12","13","14","16","17","18","19","20","b","c"];
  for (const key of keys) {
    const terms = {}, tokens = new Map();
    (entries[key] || []).forEach(([form, ...explanation], i) => {
      const id = `ml${key}term${i}`;
      terms[id] = explanation;
      tokens.set(tex(form), id);
    });
    const pattern = [...tokens.keys()].sort((a,b) => b.length-a.length).map(s => s === 'f' ? '(?<![a-zA-Z\\\\])f(?![a-zA-Z])' : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || "(?!)";
    window.guidedLessonProfiles["ml-" + key] = {terms, lookup:["11","b","c"].includes(key), pattern:new RegExp(pattern,"g"), termFor:token => tokens.get(token)};
  }
  document.addEventListener("DOMContentLoaded", () => {
    const layout = document.querySelector('.lesson-layout[data-batch="ml-rest"]');
    if (!layout) return;
    const full = layout.querySelector('.lesson-full');
    if (layout.dataset.lesson === 'ml-18') {
      const tasks = [...full.querySelectorAll('input[data-mini-task]')];
      const progress = document.getElementById('mini-task-progress');
      const storageKey = 'minitorch-task-progress-v1';
      let canSave = true;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (Array.isArray(saved)) tasks.forEach(task => { task.checked = saved.includes(task.dataset.miniTask); });
      } catch { canSave = false; }
      const updateProgress = () => {
        const count = tasks.filter(task => task.checked).length;
        progress.textContent = `已核对 ${count} / ${tasks.length} 项 · ${canSave ? '勾选记录保存在当前浏览器；不代表自动验收。' : '当前浏览器无法保存，勾选仅在本次页面有效。'}`;
      };
      tasks.forEach(task => task.addEventListener('change', () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(tasks.filter(item => item.checked).map(item => item.dataset.miniTask)));
          canSave = true;
        } catch { canSave = false; }
        updateProgress();
      }));
      updateProgress();
    }
    full.querySelectorAll('pre').forEach((pre, i) => {
      const lines = pre.textContent.trimEnd().split('\n').length;
      if (lines < 25) return;
      pre.id ||= `long-code-${i}`;
      pre.tabIndex = 0;
      pre.setAttribute('aria-label', `完整代码，共 ${lines} 行，可在框内滚动`);
      const controls = document.createElement('div');
      controls.className = 'code-read-control';
      const note = document.createElement('span');
      note.textContent = `完整 ${lines} 行均保留，可滚动或展开阅读。`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '展开完整代码';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', pre.id);
      button.addEventListener('click', () => {
        const open = pre.dataset.codeOpen !== 'true';
        pre.dataset.codeOpen = String(open);
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? '收起为滚动阅读' : '展开完整代码';
      });
      controls.append(note,button);
      (pre.closest('.codehilite') || pre).after(controls);
    });
    const input = document.getElementById('section-search');
    if (!input) return;
    const cards = [...full.querySelectorAll(':scope > .lesson-detail-card')];
    const index = cards.map(card => card.textContent.toLocaleLowerCase());
    const status = document.getElementById('section-search-status');
    const filter = () => {
      const words = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let count = 0;
      cards.forEach((card,i) => {
        card.hidden = !words.every(word => index[i].includes(word));
        if (!card.hidden) count++;
      });
      layout.querySelectorAll('.lesson-route-links a').forEach(link => {
        const id = decodeURIComponent(link.hash.slice(1));
        const target = document.getElementById(id);
        link.hidden = !!target?.closest('.lesson-detail-card')?.hidden;
      });
      status.textContent = words.length ? `匹配 ${count} 张正文卡片。${count ? '向下查看结果。' : '可换个关键词，或清除筛选。'}` : `已显示全部 ${count} 张正文卡片。`;
    };
    input.addEventListener('input', filter);
    document.getElementById('section-search-clear').addEventListener('click', () => {input.value='';filter();input.focus();});
    // A task entrance must never land inside a previously filtered-out card.
    layout.querySelectorAll('.lesson-task-entry a,.lesson-save').forEach(link => link.addEventListener('click', () => {if(input.value){input.value='';filter();}}));
    filter();
  });
})();
