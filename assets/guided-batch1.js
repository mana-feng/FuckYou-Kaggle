/* Lesson-specific explanations. Never borrow tree meanings for linear weights. */
(function () {
  "use strict";
  const tex = s => s.replaceAll("@", String.fromCharCode(92));
  function profile(entries, lookup = false) {
    const terms = {}, tokens = new Map();
    entries.forEach(([id, forms, ...explanation]) => {
      terms[id] = explanation;
      forms.forEach(form => tokens.set(tex(form), id));
    });
    const patterns = [...tokens.keys()].sort((a,b) => b.length-a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return {terms, lookup, pattern: new RegExp(patterns.join("|") || "(?!)", "g"), termFor: token => tokens.get(token)};
  }
  window.guidedLessonProfiles = {
    linear: profile([
      ["linearScore", ["w^@top x + b", "w^@top x+b"], "加权求和 wᵀx + b", "把每个特征乘上它的权重，加在一起，最后加偏置。", "在线性回归中就是预测值；在逻辑回归中是交给 Sigmoid 的原始分数。w 是特征系数，不是树的叶子输出。", "一个特征 x=100、w=0.8、b=20，原始分数就是 100。"],
      ["linearPrediction", ["@hat y_i", "@hat{y}_i", "@hat y"], "预测数值 ŷ", "模型算出的数值答案。", "和真实值 y 比较，才能算出预测误差。下标 i 代表第 i 个样本。", "真实值 3、预测值 2，误差为 1，平方误差也是 1。"],
      ["linearProbability", ["@hat p", "@hat{p}"], "预测概率 p̂", "逻辑回归对正类给出的概率估计。", "用于计算二分类交叉熵；需要做硬分类时，再与选定阈值比较。概率本身不是类别编号。", "p̂=0.9 表示模型估计正类概率为 90%，不代表这个样本一定是正类。"],
      ["linearSigmoid", ["@sigma"], "Sigmoid：分数转成概率", "把任意实数平滑地映射到 0 和 1 之间。", "接在加权求和外面，使逻辑回归能输出概率。输入越大，结果越接近 1；不是把所有负数直接判成错误。", "σ(0)=0.5，σ(2)≈0.881，σ(−2)≈0.119。"],
      ["linearLoss", ["@mathcal{L}_{L2}", "@mathcal{L}_{L1}", "@mathcal{L}"], "损失 L：这次预测有多差", "一个用来训练的评分，通常希望它越小越好。", "MSE 对数值误差平方后取平均；交叉熵衡量概率预测；带 L1/L2 下标时，还包含对权重的惩罚。具体组成请看当前整条公式。", "两个样本的平方误差是 1、4，平均 MSE 是 2.5。它不是准确率。"],
      ["linearAverage", ["@frac{1}{n}"], "1/n：取平均", "把总损失除以参与计算的样本数。", "在这条平均损失公式里，它让结果表达每个样本平均错多少；不能只加起来却漏掉除以 n。", "两个样本的损失和为 5，平均就是 5/2=2.5。"],
      ["linearSum", ["@sum_{i=1}^{n}", "@sum_i", "@sum"], "Σ：把指定的项加起来", "沿给定下标逐项相加。", "MSE 与交叉熵中合并样本损失；正则化中合并各个权重的惩罚。看被加的是误差还是权重，就能分清范围。", "MSE 示例把 1 和 4 相加得到 5；还需乘 1/n 才是平均值。"],
      ["linearTarget", ["y_i"], "真实值 yᵢ", "训练数据里第 i 个样本的已知答案。", "它不由模型产生，而是用来和预测比较，决定损失。", "某个样本的真实销量是 3，而模型预测 2，那么这里的 yᵢ 是 3。"],
      ["linearLambda", ["@lambda"], "λ：正则化强度", "控制权重惩罚在总目标中占多少分量。", "乘在 L1 或 L2 惩罚之前，越大越限制模型使用大权重。这是线性系数的约束，不是 XGBoost 的 H+λ 分母。", "若权重平方和为 4，λ=0.1 时额外成本为 0.4；λ=1 时为 4。"],
      ["linearWeight", ["w_i^2", "|w_i|", "w_i"], "特征权重及其惩罚", "wᵢ 是一个输入特征的系数；平方和绝对值都让正负权重产生非负成本。", "L2 用平方，较大的权重成本增长更快；L1 用绝对值，可能把部分权重压到恰好 0。", "wᵢ=−3 时，平方为 9，绝对值为 3。再乘 λ 才是它的惩罚贡献。"]
    ]),
    backprop: profile([
      ["bpTotal", ["@frac{@partial L}{@partial w}"], "总影响 ∂L/∂w", "损失对参数 w 的局部变化率。", "左侧是我们要求的梯度；右侧把沿这条依赖链的三个局部导数连乘。在更新公式里，优化器使用的也是这个量。", "本例 w=1，z=2，a=4，总影响为 3×4×2=24。"],
      ["bpLossA", ["@frac{@partial L}{@partial a}"], "最后一段 ∂L/∂a", "a 变化一点时，损失 L 怎样变化。", "这是链的末端。由 L=½(a−1)² 求导得到 a−1，再把它传给前面的计算。", "a=4 时，∂L/∂a=4−1=3。"],
      ["bpActivation", ["@frac{@partial a}{@partial z}"], "中间一段 ∂a/∂z", "中间输出 a 对输入 z 的局部变化率。", "本例 a=z²，所以这一段导数为 2z。真实网络中应换成实际运算的导数，不能总用这个值。", "z=2 时，∂a/∂z=4。前面传来的 3 在这里变成 3×4=12。"],
      ["bpInput", ["@frac{@partial z}{@partial w}"], "最前一段 ∂z/∂w", "z 对可训练参数 w 的局部变化率。", "本例 z=2w，所以导数是 2。乘上它，才把损失对 z 的影响换算为损失对 w 的影响。", "∂L/∂z=12，再乘 2，得到 ∂L/∂w=24。"],
      ["bpRate", ["@eta"], "学习率 η", "把梯度缩放成这次实际更新的步长。", "梯度下降减去 η 乘梯度。梯度告诉局部方向，学习率控制走多远；它不保证任何步长都会降低损失。", "η=0.01，梯度=24，这次从 w 中减去 0.24。"],
      ["bpNext", ["w_{@mathrm{new}}"], "更新后的参数", "完成一次梯度下降后得到的新 w。", "这是优化器更新的结果，不是反向传播本身。反向传播先提供当前位置的梯度。", "本例 w 从 1 更新为 1−0.01×24=0.76。"]
    ]),
    pytorch: profile([]),
    reference: profile([], true)
  };
  document.addEventListener("DOMContentLoaded", () => {
    const full = document.querySelector(".lesson-full");
    if (!full) return;
    const headings = [...full.querySelectorAll("h2:not(.lesson-original-title)")];
    document.querySelectorAll("[data-heading-jump]").forEach(link => {
      const target = headings.find(h => h.textContent.includes(link.dataset.headingJump));
      if (target) link.href = "#" + target.id;
    });
    if (document.querySelector('.lesson-layout[data-lesson="pytorch"]')) {
      full.querySelectorAll('pre').forEach(pre => {
        const lines = pre.textContent.trimEnd().split('\n').length;
        if (lines < 25) return;
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', `完整代码，共 ${lines} 行，可以在框内滚动`);
        const controls = document.createElement('div');
        controls.className = 'code-read-control';
        const note = document.createElement('span');
        note.textContent = `完整 ${lines} 行都保留着，可在代码框内向下滚动。`;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '展开完整代码';
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => {
          const open = pre.dataset.codeOpen !== 'true';
          pre.dataset.codeOpen = String(open);
          button.setAttribute('aria-expanded', String(open));
          button.textContent = open ? '收起为滚动阅读' : '展开完整代码';
        });
        controls.append(note, button);
        (pre.closest('.codehilite') || pre).after(controls);
      });
    }
    const input = document.getElementById("term-search");
    if (!input) return;
    const categories = document.querySelector(".lookup-categories");
    const sections = [...full.querySelectorAll(".lesson-detail-card")].filter(c => c.querySelector("table"));
    const records = sections.map(section => {
      const heading = section.querySelector("h2,h3");
      const link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.replace(/^[^\p{L}\p{N}]+/u, "");
      categories.append(link);
      return {section, heading, rows: [...section.querySelectorAll("table tr")].filter(row => row.querySelector("td"))};
    });
    const total = records.reduce((n,r) => n+r.rows.length, 0);
    function search() {
      const query = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let matches = 0;
      records.forEach(record => {
        let count = 0;
        record.rows.forEach(row => {
          const text = row.textContent.toLocaleLowerCase();
          const visible = query.every(word => text.includes(word));
          row.hidden = !visible;
          if (visible) count++;
        });
        record.section.hidden = count === 0;
        matches += count;
      });
      document.getElementById("term-search-status").textContent = query.length
        ? (matches ? `找到 ${matches} 行（共 ${total} 行）。下方保留匹配行的完整解释。` : "没有匹配。试试中文、英文或更短的关键词，也可以显示全部。")
        : `已显示全部 ${total} 行。选择分类可以直接跳转。`;
      categories.querySelectorAll("a").forEach((link,i) => { link.hidden = records[i].section.hidden; });
      document.querySelectorAll('.lesson-route-links a').forEach(link => {
        const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
        link.hidden = Boolean(target?.closest('.lesson-detail-card')?.hidden);
      });
    }
    input.addEventListener("input",search);
    document.getElementById("term-search-clear").addEventListener("click",() => { input.value=""; search(); input.focus(); });
    search();
  });
})();
