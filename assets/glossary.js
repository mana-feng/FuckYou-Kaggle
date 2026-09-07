/* 全站术语速查：正文中的常见术语首次出现时可点击查看。 */
(function () {
  "use strict";

  var TERMS = [
    { id: "transformer", names: ["Transformer"], group: "模型结构", meaning: "一种处理序列信息的神经网络结构。它让句子里的每个词按需要关注其他词。", role: "现代大语言模型最常见的骨架。", code: "layer = nn.TransformerEncoderLayer(d_model=512, nhead=8)" },
    { id: "token", names: ["Token", "token"], group: "文本表示", meaning: "模型实际读取的文本小单位；它不一定等于一个汉字或一个英文单词。", role: "文本要先拆成 token，模型才可以把它变成数字。", code: "ids = tokenizer(\"你好，世界\")[\"input_ids\"]" },
    { id: "tokenizer", names: ["Tokenizer", "tokenizer", "分词器"], group: "文本表示", meaning: "把原始文字拆成 token，再把 token 映射为数字编号的工具。", role: "它是文字进入语言模型前的第一道门。", code: "tokens = tokenizer.tokenize(\"机器学习很有趣\")" },
    { id: "embedding", names: ["Embedding", "embedding", "词嵌入", "嵌入向量"], group: "文本表示", meaning: "用一串浮点数表示词、句子或图片的方式；含义相近的内容通常更接近。", role: "让模型能用数字表达语义，并能计算相似度。", code: "vector = model.get_input_embeddings()(ids)" },
    { id: "attention", names: ["自注意力", "多头注意力", "注意力机制", "Attention", "attention"], group: "模型结构", meaning: "让当前位置根据任务需要，为其他位置分配不同关注程度的计算。", role: "帮助模型把相关词的信息聚在一起，例如把代词和它指代的名词关联。", code: "score = softmax(Q @ K.transpose(-1, -2))\nout = score @ V" },
    { id: "qkv", names: ["Query", "Key", "Value", "Q、K、V", "Q/K/V"], group: "注意力", meaning: "注意力中的三组数字：Q 表示“我在找什么”，K 表示“我能匹配什么”，V 是实际要传递的信息。", role: "Q 和 K 决定关注多少，权重再拿来混合 V。", code: "weights = softmax(Q @ K.T)\nout = weights @ V" },
    { id: "residual", names: ["残差连接", "残差"], group: "模型结构", meaning: "把一层的输入直接加回它的输出，形成一条保底通路。", role: "即使新计算不理想，原信息仍能往后传；深层网络更容易训练。", code: "y = x + block(x)" },
    { id: "layernorm", names: ["LayerNorm", "层归一化"], group: "训练稳定性", meaning: "按单个样本的特征维度整理数字的均值和大小。", role: "避免数字在网络中越传越大或太小。", code: "norm = nn.LayerNorm(hidden_size)\ny = norm(x)" },
    { id: "rmsnorm", names: ["RMSNorm"], group: "训练稳定性", meaning: "一种更简单的归一化：主要按数字整体大小缩放，不额外强制减去均值。", role: "常用于 LLaMA 一类模型，让数值稳定且计算更省一些。", code: "x = x / x.pow(2).mean(-1, keepdim=True).sqrt()" },
    { id: "ffn", names: ["FFN", "前馈网络"], group: "模型结构", meaning: "Transformer 每层中给每个位置单独使用的小加工网络。", role: "注意力负责“看谁”，FFN 负责“把看到的信息怎么加工”。", code: "y = linear2(F.relu(linear1(x)))" },
    { id: "swiglu", names: ["SwiGLU"], group: "模型结构", meaning: "带门控的前馈网络；一条支路提供内容，另一条支路决定内容通过多少。", role: "比简单 ReLU 更细地筛选特征，现代大模型常用。", code: "y = W2(silu(W1(x)) * W3(x))" },
    { id: "relu", names: ["ReLU"], group: "激活函数", meaning: "一种简单激活函数：负数变成 0，正数保留。", role: "给神经网络加入非线性，否则多层线性层仍近似一层线性层。", code: "y = torch.relu(x)" },
    { id: "rope", names: ["RoPE", "旋转位置编码"], group: "位置信息", meaning: "在注意力内部按位置旋转 Q、K 的数字，使比较结果带上相对距离和顺序。", role: "让模型区分“猫咬狗”和“狗咬猫”这类词相同、顺序不同的句子。", code: "Q, K = apply_rotary_pos_emb(Q, K, position_ids)" },
    { id: "backprop", names: ["反向传播", "反向传递"], group: "训练", meaning: "从损失开始，倒着计算每个参数该往哪个方向改、改多少的过程。", role: "训练神经网络时用来获得梯度。", code: "loss.backward()" },
    { id: "gradient", names: ["梯度下降", "梯度"], group: "训练", meaning: "梯度告诉参数：稍微增大或减小会让错误变好还是变坏。", role: "优化器利用梯度更新模型参数。", code: "param.data -= learning_rate * param.grad" },
    { id: "loss", names: ["损失函数", "损失", "loss"], group: "训练", meaning: "用一个数字衡量模型答案离正确答案有多远；一般越小越好。", role: "它把“哪里答错了”变成可供训练优化的目标。", code: "loss = F.cross_entropy(logits, labels)" },
    { id: "learning-rate", names: ["学习率", "learning rate"], group: "训练", meaning: "每次更新参数时迈多大一步。", role: "太大可能越走越乱，太小则学习很慢。", code: "optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)" },
    { id: "batch", names: ["批大小", "batch size", "batch"], group: "训练", meaning: "一次送给模型、再统一计算一次更新的一小批样本数量。", role: "它影响显存、训练速度和梯度的稳定程度。", code: "for x, y in DataLoader(dataset, batch_size=32):\n    train_step(x, y)" },
    { id: "epoch", names: ["epoch", "轮次"], group: "训练", meaning: "训练数据被完整看过一遍，叫一个 epoch。", role: "用于描述训练进度；更多 epoch 不一定更好，可能过拟合。", code: "for epoch in range(10):\n    train_one_epoch()" },
    { id: "overfitting", names: ["过拟合"], group: "泛化", meaning: "模型把训练数据记得太死，换到新数据反而表现不好。", role: "提醒你不要只看训练集分数，要看验证集或测试集。", code: "if val_loss > train_loss:\n    print(\"可能过拟合\")" },
    { id: "regularization", names: ["正则化"], group: "泛化", meaning: "故意限制模型不要把训练数据记得过死的一类方法。", role: "减少过拟合，让模型更可能适应新数据。", code: "optimizer = AdamW(params, weight_decay=0.01)" },
    { id: "dropout", names: ["Dropout", "dropout"], group: "泛化", meaning: "训练时随机暂时关闭一部分神经元输出。", role: "迫使模型别过度依赖某几个特征，从而减轻过拟合。", code: "drop = nn.Dropout(p=0.1)\ny = drop(x)" },
    { id: "adam", names: ["AdamW", "Adam"], group: "优化器", meaning: "常用优化器；它会参考梯度的方向与历史大小，自动调整不同参数的步子。", role: "替你实际执行“根据梯度更新参数”。AdamW 还正确处理权重衰减。", code: "optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)" },
    { id: "pytorch", names: ["PyTorch"], group: "工具", meaning: "Python 中常用的深度学习框架，提供张量、自动求导、GPU 计算和模型组件。", role: "用它可以搭建、训练、保存和部署神经网络。", code: "import torch\nx = torch.randn(2, 3)" },
    { id: "tensor", names: ["Tensor", "tensor", "张量"], group: "数据表示", meaning: "带形状和数据类型的多维数字盒子；标量、向量、矩阵都是张量的特例。", role: "深度学习框架用张量存放输入、参数和中间结果。", code: "x = torch.tensor([[1., 2.], [3., 4.]])" },
    { id: "shape", names: ["shape", "形状"], group: "数据表示", meaning: "描述张量每个维度有多长，例如 (32, 128) 常表示 32 个样本、每个有 128 个特征。", role: "许多报错都来自 shape 对不上。", code: "print(x.shape)  # 例如 torch.Size([32, 128])" },
    { id: "dtype", names: ["dtype", "数据类型"], group: "数据表示", meaning: "张量中每个数字的存储类型，例如 float32、float16、int64。", role: "它影响精度、内存占用，以及某些运算能否进行。", code: "x = x.to(torch.float16)" },
    { id: "broadcast", names: ["广播", "broadcasting"], group: "数组运算", meaning: "让形状不同但兼容的数组自动扩展，从而能逐元素计算的规则。", role: "避免手写循环，也要小心意外扩展到错误形状。", code: "x = torch.ones(2, 3)\nbias = torch.tensor([1., 2., 3.])\ny = x + bias" },
    { id: "autograd", names: ["autograd", "自动求导"], group: "训练", meaning: "框架自动记录运算关系，并在需要时计算梯度的机制。", role: "省去手动推导反向传播的大量工作。", code: "x.requires_grad_()\ny = (x ** 2).sum()\ny.backward()" },
    { id: "rag", names: ["RAG"], group: "大模型应用", meaning: "检索增强生成：先从资料库找相关内容，再把资料与问题一起交给模型回答。", role: "让模型能依据私有或最新资料回答，并尽量减少胡编。", code: "docs = retriever.search(query)\nanswer = llm(query, context=docs)" },
    { id: "lora", names: ["LoRA"], group: "微调", meaning: "低秩适配：冻结大部分原模型，只训练少量新增的小矩阵。", role: "用更少显存和训练参数，让模型适应特定任务或风格。", code: "config = LoraConfig(r=8, lora_alpha=16)\nmodel = get_peft_model(model, config)" },
    { id: "finetuning", names: ["微调", "fine-tuning"], group: "训练", meaning: "在已有预训练模型基础上，用特定任务或领域数据继续训练。", role: "把通用能力适配成更贴合你的任务的能力。", code: "trainer.train()  # 用领域数据继续训练" },
    { id: "quantization", names: ["量化"], group: "推理优化", meaning: "用更少的比特表示模型权重或中间数据，例如把 float16 改成 int8/4bit。", role: "减少显存和带宽需求，通常能让部署更便宜。", code: "model = AutoModel.from_pretrained(name, load_in_4bit=True)" },
    { id: "kv-cache", names: ["KV Cache", "KV-Cache", "KV 缓存"], group: "推理优化", meaning: "生成下一个 token 时，保存过去 token 的注意力 K、V，避免每次从头重算。", role: "显著加快逐字生成，但会占用显存。", code: "outputs = model(input_ids, use_cache=True)\npast = outputs.past_key_values" },
    { id: "gpu", names: ["GPU", "CUDA"], group: "硬件", meaning: "GPU 是擅长大量并行数学计算的处理器；CUDA 是让程序使用 NVIDIA GPU 的软件平台。", role: "深度学习的大量矩阵计算在 GPU 上通常比 CPU 快得多。", code: "device = torch.device(\"cuda\")\nmodel.to(device)" },
    { id: "inference", names: ["推理", "inference"], group: "运行模型", meaning: "用已经训练好的模型接收新输入并给出结果的阶段。", role: "和训练不同：通常不计算梯度，只追求速度、成本和稳定性。", code: "with torch.no_grad():\n    output = model(x)" },
    { id: "sql-join", names: ["JOIN", "join"], group: "SQL", meaning: "按关联字段把两张表的行组合起来的操作。", role: "例如把订单表和用户表按 user_id 合并。", code: "SELECT *\nFROM orders o\nJOIN users u ON o.user_id = u.id;" },
    { id: "null", names: ["NULL"], group: "SQL", meaning: "表示“未知或缺失”，不是 0、不是空字符串，也不等于任何值（包括它自己）。", role: "SQL 中要用 IS NULL / IS NOT NULL 判断它。", code: "SELECT * FROM users\nWHERE email IS NULL;" },
    { id: "hash", names: ["哈希函数", "哈希"], group: "安全", meaning: "把任意长度数据变成固定长度摘要的函数；通常很难从摘要反推出原文。", role: "常用于完整性校验、密码存储和签名构造。", code: "digest = hashlib.sha256(data).hexdigest()" },
    { id: "rsa", names: ["RSA"], group: "安全", meaning: "基于大整数分解困难性的公开密钥密码体制。", role: "可用于加密较短信息或验证数字签名；实际常与对称加密配合。", code: "# 公钥加密，私钥解密；或私钥签名，公钥验证" },
    { id: "ab-test", names: ["A/B 测试", "AB实验", "A/B实验"], group: "评估", meaning: "把用户随机分到 A、B 两个方案，比较一个预先定义指标的实验。", role: "帮助判断一次改动是否真的带来效果，而不是碰巧波动。", code: "uplift = metric_B - metric_A" },
    { id: "a-mdp", names: ["MDP", "马尔可夫决策过程"], group: "强化学习", meaning: "把「连着做一串决定」写成数学的标准格式：有哪些状态、能做哪些动作、做完会转到哪、拿到多少奖励。", role: "几乎所有强化学习算法都假设问题已经写成这个格式，写不成就用不了它们。", code: "# 状态 S、动作 A、转移 P(s'|s,a)、奖励 R(s,a)、折扣 γ" },
    { id: "a-bellman", names: ["贝尔曼方程"], group: "强化学习", meaning: "一条把「现在这一步的价值」拆成「立刻拿到的奖励 + 下一步的价值」的等式。", role: "整个强化学习都建在它上面，后面所有算法都是在用不同办法解它。", code: "V(s) = R(s) + γ * max_a Σ P(s'|s,a) * V(s')" },
    { id: "a-value-function", names: ["价值函数"], group: "强化学习", meaning: "给每个状态（或每个「状态＋动作」）打一个分，表示从这里出发往后能拿到多少奖励。", role: "有了它就能比较两个选择谁更好，而不用真的走到最后再看。", code: "# V(s)：这个状态值多少\n# Q(s,a)：在这个状态做这个动作值多少" },
    { id: "a-policy-gradient", names: ["策略梯度"], group: "强化学习", meaning: "不去估每个动作值多少分，而是直接调整「做各个动作的概率」这个策略本身。", role: "动作是连续的时候（比如方向盘转多少度），没法对所有动作取最大值，只能走这条路。", code: "loss = -(logp * advantage).mean()\nloss.backward()" },
    { id: "a-ppo", names: ["PPO"], group: "强化学习", meaning: "一种策略梯度算法，核心是每次更新都不许策略离原来太远。", role: "强化学习最容易崩在「一步迈太大」上；它是目前最常用的稳妥做法，大模型对齐也用它。", code: "ratio = (logp_new - logp_old).exp()\nloss = -torch.min(ratio * adv, ratio.clamp(0.8, 1.2) * adv).mean()" },
    { id: "a-rlhf", names: ["RLHF"], group: "对齐", meaning: "用人的偏好来训模型：先让人对两个回答挑一个更好的，训出一个打分模型，再用强化学习让语言模型去追高分。", role: "它是把「会续写文本」的模型变成「会当助手」的那一步。", code: "# ① 收集人类偏好 → ② 训奖励模型 → ③ 用 PPO 优化策略" },
    { id: "a-dpo", names: ["DPO"], group: "对齐", meaning: "跳过奖励模型和强化学习，直接拿成对的「好回答/坏回答」当监督信号来微调。", role: "比 RLHF 少两个环节，训练更稳也更便宜；代价是不好在训练中途换偏好。", code: "# 只要 (prompt, chosen, rejected) 三元组，一个损失函数直接训" },
    { id: "a-explore-exploit", names: ["探索与利用"], group: "强化学习", meaning: "去试没试过的选项（可能更好），还是重复已知最好的那个——这两者永远在抢同一份预算。", role: "只利用会永远错过更好的选项，只探索会一直在交学费；怎么分配是个必须显式决定的事。", code: "if random.random() < eps:\n    a = random_action()   # 探索\nelse:\n    a = best_action()     # 利用" },
    { id: "a-discount", names: ["折扣因子"], group: "强化学习", meaning: "一个 0 到 1 之间的数，表示「以后的奖励折算到现在值多少」。", role: "它决定模型有多看重长远：接近 0 只顾眼前，接近 1 会为很远的回报忍耐。", code: "G = r0 + gamma * r1 + gamma**2 * r2 + ..." },
    { id: "a-td", names: ["时序差分", "TD 学习"], group: "强化学习", meaning: "不用等一局结束，走一步就拿「实际拿到的奖励 + 对下一步的估计」来修正当前估计。", role: "它让学习可以边走边更新，不必像蒙特卡洛那样等到终局才知道好坏。", code: "V[s] += alpha * (r + gamma * V[s2] - V[s])" },
    { id: "a-qlearning", names: ["Q-learning"], group: "强化学习", meaning: "直接学一张「在这个状态做这个动作值多少分」的表，更新时总是假设下一步会选最好的动作。", role: "它不需要知道环境规则，也不要求你按当前策略行动，边试边学就行。", code: "Q[s,a] += alpha * (r + gamma * Q[s2].max() - Q[s,a])" },
    { id: "a-nash", names: ["纳什均衡"], group: "博弈论", meaning: "一组策略，其中每个人在别人不改的前提下，单独改自己都不会更好。", role: "它是「谁都不想动」的稳定点，但不代表这个结果对大家最好。", code: "# 囚徒困境里「都坦白」就是纳什均衡——虽然都抵赖更好" },
    { id: "a-dominant", names: ["占优策略"], group: "博弈论", meaning: "不管别人怎么做，选它都不比选别的差的那个策略。", role: "有占优策略时不用猜别人，直接选它；这也是机制设计追求的性质。", code: "# 对每一种对手行为都算一遍，若某行始终不劣，它就是占优的" },
    { id: "a-shapley", names: ["Shapley 值", "Shapley值"], group: "博弈论", meaning: "把合作产生的总收益分给每个参与者的一种方法：看他加入不同顺序的队伍时平均带来多少增量。", role: "它是唯一同时满足几条公平性要求的分法；机器学习里的 SHAP 就是借了这套思路。", code: "# 对所有加入顺序取平均：φ_i = 平均(有他的收益 − 没他的收益)" },
    { id: "a-stable-matching", names: ["稳定匹配"], group: "博弈论", meaning: "一种配对结果：找不出任何一对人，他们都更想跟对方在一起而不是现在的搭档。", role: "没有这个性质的配对会自己散掉；招生、住院医师分配都靠它。", code: "# Gale-Shapley：一方轮流求婚，另一方随时可以换更好的" },
    { id: "a-pareto", names: ["帕累托最优", "帕累托改进"], group: "博弈论", meaning: "没法在不损害任何一个人的前提下让另一个人更好，这种状态叫帕累托最优。", role: "它是「有没有白拿的好处」的判据；注意它完全不管公平，极端不均也可以是帕累托最优。", code: "# 存在一个方案让所有人都不更差、至少一人更好 → 当前不是帕累托最优" },
    { id: "a-incentive-compatible", names: ["激励相容"], group: "机制设计", meaning: "规则设计得让每个人「说真话 / 按真实想法行动」就是自己的最优选择。", role: "不满足它的机制会被参与者操纵，你收上来的信息全是策略性的假话。", code: "# 第二价格拍卖：出价等于真实估值是占优策略" },
    { id: "a-prisoner", names: ["囚徒困境"], group: "博弈论", meaning: "两个人各自都选对自己更好的那步，结果两人一起变差的经典局面。", role: "它说明「每个人都理性」和「集体结果好」是两件事，这是很多制度存在的理由。", code: "# 都抵赖最好，但坦白是占优策略 → 均衡是双双坦白" },
    { id: "a-mechanism-design", names: ["机制设计"], group: "机制设计", meaning: "反过来做博弈论：先定好想要的结果，再去设计一套规则让理性的人自己走到那儿。", role: "当参与者有各自的利益、还会撒谎时，改规则比劝人有效。", code: "# 想要的结果 → 倒推规则（收益、约束、信息）" },
    { id: "a-uniform-cost", names: ["一致代价搜索", "一致代价"], group: "搜索", meaning: "每次都优先展开「到目前为止花费最小」的那个节点的搜索方式。", role: "边的代价不一样时，它能保证找到最便宜的路；代价是要展开很多节点。", code: "# 优先队列按 g(n)（已花费）排序取出" },
    { id: "a-csp", names: ["约束满足"], group: "搜索", meaning: "一类问题：给一堆变量各挑一个值，同时满足所有约束（比如相邻的两块不能同色）。", role: "排课、排班、数独、地图着色都是它；它有一套通用解法，不用每个问题重写算法。", code: "# 变量 X、值域 D、约束 C —— 三样定义完就能套通用求解器" },
    { id: "a-bayes-net", names: ["贝叶斯网络"], group: "概率推理", meaning: "用一张有向图表示一堆随机变量之间谁直接影响谁，箭头旁边挂着条件概率。", role: "它让你不用存一张巨大的联合概率表，也能回答「已知这些，那个的概率是多少」。", code: "# P(全部) = 每个节点 P(自己 | 它的父节点) 连乘" },
    { id: "a-arc-consistency", names: ["弧相容"], group: "搜索", meaning: "检查每一对变量：如果某个取值在对面找不到任何能配的值，就提前把它从值域里删掉。", role: "它把「撞了墙才知道」变成「还没走就知道整片区域是墙」，能砍掉大量无用搜索。", code: "# AC-3：反复删不可能的取值，直到没得删" },
    { id: "a-minimax", names: ["极小化极大", "Minimax"], group: "对抗搜索", meaning: "两人零和对弈时，我方选让自己收益最大的走法，同时假设对方永远选让我收益最小的走法。", role: "它是所有棋类 AI 的骨架：把「对手会针对我」这件事写进了搜索本身。", code: "# 我方取 max，对方取 min，一层一层交替往上回传" },
    { id: "a-alpha-beta", names: ["α-β 剪枝"], group: "对抗搜索", meaning: "在极小化极大搜索里，一旦发现某个分支不可能影响最终选择，就整枝不再往下看。", role: "结果和不剪枝完全一样，但在好的走子顺序下能让搜索深度翻倍。", code: "if beta <= alpha:\n    break   # 这枝再看下去也改变不了结果" },
    { id: "b-cf", names: ["协同过滤"], group: "推荐", meaning: "不看物品内容，只看「谁和谁的行为像」来推荐：喜欢过同样东西的人，接下来大概也喜欢同样的东西。", role: "推荐系统最早也最省事的一类做法，只要有行为日志就能跑。", code: "# 用户-物品矩阵里找相似行（相似用户）或相似列（相似物品）" },
    { id: "b-mf", names: ["矩阵分解"], group: "推荐", meaning: "把巨大的「用户 × 物品」评分表拆成两张窄表，用户和物品各自得到一串数字。", role: "没打过分的格子可以用两串数字相乘补出来，这就是预测；它也是向量召回的前身。", code: "score = user_vec @ item_vec.T" },
    { id: "b-coarse-rank", names: ["粗排"], group: "推荐", meaning: "召回和精排之间的一道过滤：用一个很轻的模型把几千个候选砍到几百个。", role: "精排模型太贵，喂不起几千个候选；粗排的存在就是为了让精排算得起。", code: "# 召回(万) → 粗排(千→百) → 精排(百) → 重排" },
    { id: "b-fine-rank", names: ["精排"], group: "推荐", meaning: "漏斗最后一道打分：用最重的模型给几百个候选算出精确的点击/转化概率。", role: "最终排序基本由它决定，线上大部分算力也花在这里。", code: "# 特征最全、模型最大、候选最少的那一层" },
    { id: "b-ctr", names: ["CTR"], group: "推荐", meaning: "点击率，点击次数除以曝光次数。", role: "推荐和广告最核心的那个预估目标；广告的出价排序也建在它上面。", code: "ctr = clicks / impressions" },
    { id: "b-two-tower", names: ["双塔"], group: "推荐", meaning: "用户和物品各走一个独立的网络算出向量，最后只用一次内积算相似度。", role: "因为两边不交互，物品向量可以离线算好建索引，才让「从千万个里秒选一批」成为可能。", code: "score = user_tower(u) @ item_tower(i).T" },
    { id: "b-cold-start", names: ["冷启动"], group: "推荐", meaning: "新用户或新物品没有历史行为，模型无从判断该给谁看。", role: "它是推荐系统的常态而不是例外：不处理就会形成「没曝光→没数据→更没曝光」的死循环。", code: "# 新物品先给一点探索流量，拿到反馈再进正常排序" },
    { id: "b-ann", names: ["向量检索", "ANN"], group: "检索", meaning: "在千万级向量里快速找出和查询最像的那几个，靠的是「差不多准就行」来换速度。", role: "精确算距离要遍历全库，根本来不及；RAG 和推荐召回都建在它上面。", code: "index.add(vectors)\nD, I = index.search(query_vec, k=10)" },
    { id: "b-multi-recall", names: ["多路召回"], group: "推荐", meaning: "同时跑好几种召回策略（协同、向量、热门、地理…），把各路结果合起来。", role: "任何单一策略都有系统性盲区，多路并行是最省事的补法。", code: "cands = set(cf()) | set(vector()) | set(hot())" },
    { id: "b-data-contract", names: ["数据契约"], group: "数据", meaning: "上下游之间关于一份数据长什么样的书面约定：字段、类型、单位、时区、枚举值、能不能为空。", role: "没有它，上游改一行 SQL 只要五分钟，下游排查为什么模型崩了要三天。", code: "# 字段 / 类型 / 单位 / 时区 / 枚举 / 可空性 / 变更怎么通知" },
    { id: "b-leakage", names: ["数据泄漏", "数据泄露"], group: "数据", meaning: "训练时用到了预测那一刻根本拿不到的信息，最典型的是用了未来的数据。", role: "它让离线指标好得不真实，而线上一定会打回原形；「离线好线上差」头号原因。", code: "# 特征的时间必须早于标签的时间——每一列都要能说清这一点" },
    { id: "b-iaa", names: ["标注一致性"], group: "数据", meaning: "同一批数据交给不同的人标，他们标得有多像。", role: "人和人标不一致的地方，往往正是任务定义本身模糊的地方——那是最值钱的信号。", code: "# Cohen's kappa / Krippendorff's alpha" },
    { id: "b-active-learning", names: ["主动学习"], group: "数据", meaning: "不随机挑数据去标，而是让模型指出它最没把握的那些，优先标它们。", role: "标注预算有限时，它能用更少的标注拿到同样的效果。", code: "idx = uncertainty(model, pool).argsort()[-k:]" },
    { id: "b-synthetic-data", names: ["合成数据"], group: "数据", meaning: "不是真实采集来的、由规则或模型生成出来的数据。", role: "能补稀缺场景，但拿它反复训自己会让分布越缩越窄，最后模型只会说自己的口癖。", code: "# 红线：评测集里绝不能混进合成数据" },
    { id: "b-survivorship", names: ["幸存者偏差"], group: "数据", meaning: "你手上的数据只包含「活下来 / 被记录下来」的那部分，失败的那部分根本没进样本。", role: "用这种数据训出来的模型会系统性地高估效果，而且从数据本身看不出问题。", code: "# 每一个 WHERE 都要有人能解释：它挡掉的是谁" },
    { id: "b-data-drift", names: ["数据漂移"], group: "运维", meaning: "上线之后，进来的数据分布和训练时不一样了。", role: "模型本身没变，但它见到的世界变了，效果会悄悄退化而不会报错。", code: "# 用 PSI / KS 检验对比线上分布和训练分布" },
    { id: "b-concept-drift", names: ["概念漂移"], group: "运维", meaning: "输入还是老样子，但「输入和答案之间的关系」变了。", role: "它比数据漂移更阴险：只看输入分布完全发现不了，必须有标签或代理信号才能察觉。", code: "# P(x) 没变，P(y|x) 变了 —— 监控输入分布看不见" },
    { id: "b-shap", names: ["SHAP"], group: "可解释", meaning: "把一次预测的结果拆开，算出每个特征各推高或拉低了多少，用的是 Shapley 值那套分配思路。", role: "它能解释「模型为什么这样判」，但它说的是模型的想法，不是世界的因果。", code: "values = shap.TreeExplainer(model).shap_values(X)" },
    { id: "b-psi", names: ["PSI"], group: "运维", meaning: "衡量两个分布差多远的一个数：把取值分桶，比较每个桶的占比。", role: "最常用的漂移报警指标；但它只看输入分布，对概念漂移完全失明。", code: "psi = Σ (线上占比 − 训练占比) * ln(线上占比 / 训练占比)" },
    { id: "b-simpson", names: ["辛普森悖论"], group: "实验", meaning: "每个子群里 A 都比 B 好，合在一起看却是 B 更好。", role: "它意味着「看总量」可能给出和「看分组」完全相反的结论，而两边数据都没错。", code: "# 合并前先问：各组的样本量是不是差很多" },
    { id: "b-proxy-metric", names: ["代理指标"], group: "实验", meaning: "真正想优化的东西太慢或测不了，就先拿一个能快速测到的指标顶上。", role: "它让实验能在几天内出结论；风险是优化代理指标反而伤害真实目标。", code: "# 想要「长期留存」，先看「次日回访」——但要定期验证两者还挂钩" },
    { id: "b-shadow", names: ["影子模式", "影子流量"], group: "上线", meaning: "新模型跟着线上流量一起算，但结果不返回给用户，只记下来做对比。", role: "能在零风险的前提下看到新模型在真实流量上的表现和性能开销。", code: "# 请求同时打给老模型和新模型，只用老模型的结果响应" },
    { id: "c-flash-attention", names: ["FlashAttention"], group: "训练加速", meaning: "一种注意力实现：把计算分块放在片上高速缓存里做完，绝不把那张 n×n 的中间矩阵写回显存。", role: "浮点运算一次没少，却快了好几倍——因为瓶颈本来就不是算力而是搬数据。", code: "F.scaled_dot_product_attention(q, k, v)  # 会自动走 Flash 内核" },
    { id: "c-tensor-parallel", names: ["张量并行"], group: "分布式", meaning: "把同一层的权重矩阵横着或竖着切开，放到几张卡上，每张算一部分再拼起来。", role: "单层大到一张卡放不下时只能这么办；代价是每层都要通信，只适合卡间带宽高的机内。", code: "# 一个 4096×4096 的矩阵切成 4 份，每卡算 4096×1024" },
    { id: "c-data-parallel", names: ["数据并行"], group: "分布式", meaning: "每张卡放一份完整模型，各喂一批不同的数据，算完梯度后同步平均。", role: "最简单也最常用的扩展方式；瓶颈是每步都要把梯度在所有卡之间对一遍。", code: "model = DistributedDataParallel(model)" },
    { id: "c-pipeline-parallel", names: ["流水线并行"], group: "分布式", meaning: "把模型按层切成几段放到不同卡上，数据像流水线一样一段段往下传。", role: "层数太多放不下时用它；代价是会有卡在等前一段，得靠切小批次把空转填上。", code: "# 微批次越多，气泡越小（经验：微批数 ≥ 4 × 段数）" },
    { id: "c-fsdp", names: ["FSDP"], group: "分布式", meaning: "把模型参数、梯度、优化器状态都切开分散到各卡，用到哪一层才临时把它拼回来。", role: "它让「显存装不下的模型」变成「装得下」，代价是多出来的通信。", code: "model = FullyShardedDataParallel(model)" },
    { id: "c-mixed-precision", names: ["混合精度"], group: "训练加速", meaning: "大部分计算用 16 位浮点做，但把权重主副本和累加这些怕丢精度的环节留在 32 位。", role: "显存少一半、速度快一截，而效果基本不掉；现在是训练的默认配置。", code: "with torch.autocast(\"cuda\", dtype=torch.bfloat16):\n    loss = model(x)" },
    { id: "c-mfu", names: ["MFU"], group: "性能", meaning: "模型算力利用率：你实际用到的浮点算力，占这张卡理论峰值的百分之几。", role: "它是判断「还有多少优化空间」的唯一靠谱数字；不看它调优基本靠猜。", code: "mfu = 实际_FLOPs每秒 / 峰值_FLOPs每秒" },
    { id: "c-speculative", names: ["投机解码"], group: "推理优化", meaning: "让一个小模型先连猜好几个词，再让大模型一次前向把这几个一起验证，对的部分直接采用。", role: "大模型验 4 个和生成 1 个耗时差不多，所以猜中率够高就是净赚，而且输出分布和原模型完全一致。", code: "# 小模型猜 k 个 → 大模型一次验完 → 接受前面对的那段" },
    { id: "c-paged-attention", names: ["PagedAttention"], group: "推理优化", meaning: "借操作系统分页的思路管理 KV Cache：按小块分配，不再给每个请求预留一整段连续显存。", role: "它把 KV Cache 的浪费从一半以上降到几个百分点，是 vLLM 吞吐高的主要原因。", code: "# KV Cache 切成固定大小的块，用页表索引，不要求物理连续" },
    { id: "c-grad-checkpoint", names: ["梯度检查点", "重计算"], group: "显存", meaning: "前向时只留少数几个中间结果，反向需要时再把丢掉的那段重新算一遍。", role: "拿时间换显存的标准手段，通常多花约三分之一的算力换回大半的激活值显存。", code: "from torch.utils.checkpoint import checkpoint\ny = checkpoint(block, x)" },
    { id: "c-vram", names: ["显存"], group: "硬件", meaning: "显卡上的内存。模型权重、梯度、优化器状态、激活值和 KV Cache 都要住在这里。", role: "训练和推理最先撞到的墙几乎总是它，而不是算力。", code: "print(torch.cuda.memory_allocated() / 1e9, \"GB\")" },
    { id: "c-sse", names: ["SSE"], group: "后端", meaning: "一种让服务器持续往浏览器推文本的单向连接，基于普通 HTTP。", role: "大模型回答又长又慢，用它才能一个字一个字往外吐，而不是让用户干等几十秒。", code: "async def gen():\n    yield f\"data: {chunk}\n\n\"" },
    { id: "c-jwt", names: ["JWT"], group: "认证", meaning: "一段自带签名的令牌，服务端不用查库就能验证它没被篡改、也知道里面写的是谁。", role: "省掉了会话查询，但代价很实在：签发之后在过期前很难作废。", code: "payload = jwt.decode(token, key, algorithms=[\"HS256\"])" },
    { id: "c-cors", names: ["CORS"], group: "安全", meaning: "浏览器的一套规则：页面向另一个域发请求时，得由那个域明确回复「允许」才放行。", role: "它保护的是用户而不是你的服务器；配错了要么前端全红，要么把自己的接口对全网敞开。", code: "Access-Control-Allow-Origin: https://app.example.com" },
    { id: "c-idempotent", names: ["幂等"], group: "接口设计", meaning: "同一个请求发一次和发十次，结果一样。", role: "网络会超时、客户端会重试，没有幂等就会出现重复下单、重复扣费。", code: "# 客户端带 Idempotency-Key，服务端按它去重" },
    { id: "c-rate-limit", names: ["限流"], group: "后端", meaning: "给每个用户或每个接口设一个「单位时间最多多少次」的闸门，超了就拒绝或排队。", role: "AI 应用每次请求都真花钱，没有它一个死循环脚本就能烧掉一天预算。", code: "# 令牌桶：按固定速率发令牌，没令牌就拒" },
    { id: "c-multitenant", names: ["多租户"], group: "后端", meaning: "一套系统同时服务多个互不相干的客户，各自的数据必须严格隔离。", role: "最要命的地方是查漏了一个 WHERE 条件时不会报错，只会静静把别人的数据返回给你。", code: "# 每张业务表都带 tenant_id，且每条查询都必须带上它" },
    { id: "c-pool", names: ["连接池"], group: "后端", meaning: "预先建好一批数据库连接反复复用，而不是每次请求都新建再关掉。", role: "建连接比查询本身还贵；池子大小定错了，要么排队要么把数据库压垮。", code: "engine = create_engine(url, pool_size=10, max_overflow=5)" },
    { id: "c-window-func", names: ["窗口函数"], group: "SQL", meaning: "给每一行都算一个「参照它周围一批行」得到的值，但不像 GROUP BY 那样把行合并掉。", role: "排名、累计、同比、移动平均都靠它；它让「每一行有自己的统计口径」变得可写。", code: "SELECT id, SUM(v) OVER (PARTITION BY uid ORDER BY t) FROM t;" },
    { id: "c-cte", names: ["CTE"], group: "SQL", meaning: "用 WITH 给一段子查询起个名字，后面直接当表用；加上 RECURSIVE 还能自己调用自己。", role: "它把嵌套很深的子查询拉平成可读的几步；递归形式是纯 SQL 里唯一能查「全部上游」的办法。", code: "WITH t AS (SELECT ...)\nSELECT * FROM t;" },
    { id: "c-explain", names: ["执行计划"], group: "SQL", meaning: "数据库打算怎么执行你这条查询：先读哪张表、用不用索引、怎么连接。", role: "同一句 SQL 语义没错却慢一百倍时，只有它能告诉你数据库到底在干什么。", code: "EXPLAIN QUERY PLAN SELECT ...;" },
    { id: "c-fanout", names: ["扇出"], group: "SQL", meaning: "一对多的连接会把左表的行复制好几份，行数被放大。", role: "扇出之后再做 SUM 会把金额算成好几倍，而查询本身不会报任何错。", code: "-- 先聚合再连接，或者用 EXISTS 代替 JOIN" },
    { id: "d-mle", names: ["最大似然"], group: "数学原理", meaning: "在所有可能的参数里，挑那个「让已经观察到的数据最有可能发生」的。", role: "它是绝大多数损失函数的出处——选一个噪声假设，最大似然就给出对应的损失。", code: "# 高斯噪声 → 平方损失；伯努利 → 交叉熵" },
    { id: "d-kl", names: ["KL 散度", "KL散度"], group: "数学原理", meaning: "衡量「用分布 Q 去近似真实分布 P」要多付出多少代价，单位可以理解成多花的比特数。", role: "它不对称：前向和反向 KL 逼出来的近似形状完全不同；变分推断和扩散模型都建在它上面。", code: "kl = (p * (p / q).log()).sum()" },
    { id: "d-kernel-trick", names: ["核技巧"], group: "数学原理", meaning: "不真的把数据映射到高维空间，而是直接用一个函数算出「映射后两点的内积」。", role: "它让线性模型能画出弯曲的边界，而计算量不随那个高维空间的维度增长。", code: "K(x, z) = exp(-gamma * ||x - z||**2)" },
    { id: "d-vc", names: ["VC 维", "VC维"], group: "数学原理", meaning: "一个模型族能「随便怎么标都分得开」的最大点数，用来刻画它有多复杂。", role: "它把「模型复杂度」变成一个能算的数，从而给出泛化误差的理论上界。", code: "# 二维线性分类器的 VC 维是 3" },
    { id: "d-bias-variance", names: ["偏差方差分解"], group: "数学原理", meaning: "把预测误差拆成三块：偏差（模型太简单系统性地偏）、方差（换批数据结果就抖）、噪声（谁也消不掉）。", role: "它解释了为什么复杂度和误差是 U 形关系，也说明该往哪个方向救：偏差高就加复杂度，方差高就加数据或正则。", code: "误差 = 偏差² + 方差 + 噪声" },
    { id: "d-cv", names: ["交叉验证"], group: "评估", meaning: "把数据切成 k 份，轮流拿一份当验证集、其余训练，最后把 k 次结果平均。", role: "数据不多时它比单次留出更稳；但切分方式错了（时间序列、分组数据）它会给出虚高的分数。", code: "scores = cross_val_score(model, X, y, cv=5)" },
    { id: "d-pca", names: ["PCA"], group: "数学原理", meaning: "找出数据里方差最大的那几个方向，把点投影上去，用更少的维度保留大部分信息。", role: "降维、去相关、可视化都用它；但它只认线性方向，也不管这些方向对任务有没有用。", code: "X2 = PCA(n_components=2).fit_transform(X)" },
    { id: "d-svm", names: ["SVM"], group: "模型", meaning: "找一条离两类样本都尽量远的分界线，只有最靠近边界的那几个点（支持向量）说了算。", role: "小数据上很强，配合核技巧还能画弯的边界；代价是样本一多就吃不消。", code: "clf = SVC(kernel=\"rbf\", C=1.0).fit(X, y)" },
    { id: "d-cross-entropy", names: ["交叉熵"], group: "训练", meaning: "衡量模型给出的概率分布和真实答案差多远：正确类别的概率越低，损失越大。", role: "分类任务的默认损失；它和 softmax 合起来算，梯度形式极其简洁也更稳定。", code: "loss = F.cross_entropy(logits, labels)" },
    { id: "d-vanishing-gradient", names: ["梯度消失"], group: "训练", meaning: "反向传播要连乘很多层的导数，每层都小于 1 的话，传到前面几层就几乎变成 0。", role: "前面的层学不动，网络白深；残差连接、ReLU、归一化这一整套都是在治它。", code: "# 连乘 0.5 走 20 层：0.5**20 ≈ 1e-6" },
    { id: "d-gradient-explosion", names: ["梯度爆炸"], group: "训练", meaning: "和梯度消失相反：连乘的因子大于 1，梯度指数级放大，一步就把权重冲飞。", role: "表现是 loss 突然变成 NaN；标准解法是梯度裁剪。", code: "torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)" },
    { id: "d-decision-tree", names: ["决策树"], group: "模型", meaning: "一层层问「这个特征大于某个值吗」，顺着答案往下走，最后落到一个叶子给出预测。", role: "天然能处理类别特征和缺失，不用做归一化，而且能画出来给人看。", code: "clf = DecisionTreeClassifier(max_depth=4).fit(X, y)" },
    { id: "d-random-forest", names: ["随机森林"], group: "模型", meaning: "训很多棵互相不太一样的树（各看一部分样本和一部分特征），最后投票。", role: "单棵树方差大，多棵一平均就稳了；它是表格数据上最省心的基线。", code: "clf = RandomForestClassifier(n_estimators=300).fit(X, y)" },
    { id: "d-xgboost", names: ["XGBoost"], group: "模型", meaning: "一棵接一棵地训树，每棵都专门去补前面所有树加起来还差的那部分。", role: "表格数据上长期的冠军方案；和随机森林的区别是它串行纠错，不是并行投票。", code: "model = xgboost.XGBClassifier(n_estimators=500).fit(X, y)" },
    { id: "d-ensemble", names: ["集成学习"], group: "模型", meaning: "把多个模型的结果合起来用，靠的是它们犯的错不一样，平均之后互相抵消。", role: "提升效果最稳的一招；前提是成员之间要足够不同，全一样的模型融了也白融。", code: "pred = (m1.predict(X) + m2.predict(X)) / 2" },
    { id: "d-blending", names: ["模型融合"], group: "竞赛", meaning: "把好几个模型的预测按权重合并，或者再训一个模型去学怎么合并。", role: "竞赛里最后一两个百分点基本都来自它；线上则要权衡它带来的延迟和成本。", code: "pred = 0.6 * pred_a + 0.4 * pred_b" },
    { id: "d-conv", names: ["卷积"], group: "模型结构", meaning: "让同一个小窗口在整张图上滑过去，每次把窗口里的一小片数字变成一个数字。", role: "整张图共用一个核，所以参数量和图多大无关；而且天然假设「相邻的像素才相关」。", code: "conv = nn.Conv2d(3, 64, kernel_size=3, padding=1)" },
    { id: "d-batchnorm", names: ["BatchNorm"], group: "训练稳定性", meaning: "对一批样本的同一个特征做归一化，让它的尺度保持稳定。", role: "主要作用是让训练更稳更快；⚠️ 它在训练和推理时行为不同，切模式忘了会直接出错。", code: "bn = nn.BatchNorm2d(64)\nmodel.eval()   # 推理时用累计的均值方差" },
    { id: "d-early-stopping", names: ["早停"], group: "训练", meaning: "盯着验证集指标，连着若干轮不再变好就停下，并回到最好的那一版权重。", role: "最便宜的正则化手段；也省掉了「到底该训多少轮」这个没法先验回答的问题。", code: "if no_improve >= patience:\n    break" },
    { id: "d-augmentation", names: ["数据增强"], group: "训练", meaning: "对训练数据做一些不改变答案的变换（翻转、裁剪、换同义词），造出更多样本。", role: "等于告诉模型「这些变化不重要」，比单纯加正则更有针对性。", code: "# 图像：随机裁剪 + 翻转；文本：同义替换 + 回译" },
    { id: "d-confusion-matrix", names: ["混淆矩阵"], group: "评估", meaning: "一张表，行是真实类别、列是预测类别，格子里是数量。", role: "准确率会掩盖类别不平衡；只有看这张表才知道模型到底把谁错认成了谁。", code: "print(confusion_matrix(y_true, y_pred))" },
    { id: "d-auc", names: ["AUC"], group: "评估", meaning: "任取一个正样本和一个负样本，模型给正样本打分更高的概率。", role: "它只看排序不看绝对分值，所以阈值怎么定都不影响它；但也因此看不出校准好不好。", code: "score = roc_auc_score(y_true, y_score)" },
    { id: "d-moe", names: ["MoE", "混合专家"], group: "模型结构", meaning: "把一层里的 FFN 换成很多个「专家」，每个 token 只路由到其中少数几个。", role: "总参数量可以做得很大，而每次实际计算量不变；代价是显存要装下全部专家，还要防路由不均。", code: "# 总参数 8 个专家，每个 token 只激活 2 个" },
    { id: "d-context-window", names: ["上下文窗口"], group: "大模型", meaning: "模型一次能读进去的 token 数上限，提示词、历史对话、检索到的资料都算在里面。", role: "它是硬上限，超了要么报错要么被截断；⚠️ 能装下多少是容量，能稳定用好多少是能力，两件事。", code: "# 窗口 128k ≠ 在 128k 上都表现一样好" },
    { id: "d-top-p", names: ["top-p"], group: "解码", meaning: "生成下一个词时，只在「累计概率刚好超过 p」的那一小撮候选里随机挑。", role: "比固定取前 k 个更自适应：分布很尖时候选自动变少，很平时自动变多。", code: "model.generate(ids, top_p=0.9, temperature=0.7)" },
    { id: "d-temperature", names: ["采样温度", "温度参数"], group: "解码", meaning: "一个缩放 logits 的数：调低让分布更尖（更确定、更重复），调高让分布更平（更发散、更容易胡说）。", role: "它是「输出飘」和「输出死板」之间那个唯一的旋钮，调之前先确认问题真的出在采样上。", code: "probs = softmax(logits / temperature)" },
    { id: "d-beam-search", names: ["beam search"], group: "解码", meaning: "每步保留概率最高的若干条候选序列一起往下走，最后选整句概率最高的。", role: "翻译、摘要这类有标准答案的任务上好用；开放式聊天上会让输出变得又短又平淡。", code: "model.generate(ids, num_beams=4)" },
    { id: "d-pretrain", names: ["预训练"], group: "大模型", meaning: "用海量无标注文本让模型学「下一个词是什么」，从中顺带学到语言和世界的大量模式。", role: "这一步给的是能力；它之后的 SFT 和对齐都只是在教它怎么把能力用出来。", code: "# 目标只有一个：预测下一个 token" },
    { id: "d-hallucination", names: ["幻觉"], group: "大模型", meaning: "模型流畅地编出一个看起来合理、实际不存在的事实或引用。", role: "它不是 bug 而是「按概率续写」的自然结果；RAG 和引用溯源是工程上最常用的两道防线。", code: "# 让模型只依据检索到的原文回答，并要求给出出处" },
    { id: "e-gil", names: ["GIL"], group: "Python", meaning: "CPython 里的一把全局锁：同一时刻只允许一个线程执行 Python 字节码。", role: "所以多线程救不了 CPU 密集的活；但 I/O 等待时锁会放开，网络请求这类照样能靠多线程加速。", code: "# CPU 密集用多进程或放到 C 扩展里，I/O 密集才用多线程" },
    { id: "e-decorator", names: ["装饰器"], group: "Python", meaning: "一个吃函数、吐函数的函数，用 @ 语法糖挂在定义上面，在不改原函数的前提下加一层行为。", role: "计时、缓存、重试、权限检查都靠它；框架的路由注册也是这么实现的。", code: "@functools.wraps(fn)\ndef wrapper(*a, **kw):\n    return fn(*a, **kw)" },
    { id: "e-context-manager", names: ["上下文管理器"], group: "Python", meaning: "配合 with 使用的对象，进入时做准备、退出时保证收尾——哪怕中间抛了异常。", role: "文件、锁、连接、临时改配置这类「必须还回去」的东西，交给它比手写 try/finally 可靠。", code: "with open(path) as f:\n    data = f.read()   # 出了作用域一定关闭" },
    { id: "e-stride", names: ["stride", "步长"], group: "NumPy", meaning: "数组每个维度上「走一格，在内存里要跨过多少字节」。", role: "转置、切片之所以能不复制数据就换个看法，靠的就是只改 stride 不动内存。", code: "print(a.strides)   # 例如 (24, 8)" },
    { id: "e-vectorize", names: ["向量化"], group: "NumPy", meaning: "把「对每个元素写循环」改写成对整块数组的一次运算，让循环落到底层的 C 里去跑。", role: "同样的计算通常快几十倍；而且写出来的代码往往更短、更接近公式本身。", code: "# 慢：for i in range(n): out[i] = a[i] * b[i]\nout = a * b" },
    { id: "e-graph", names: ["计算图"], group: "PyTorch", meaning: "前向计算时顺手记下的一张「谁由谁算出来」的图，反向传播就沿着它往回走。", role: "你从来不用显式定义它——但也正因为它是动态记下来的，就地操作和提前释放才会让它出问题。", code: "y = (x ** 2).sum()\ny.backward()      # 沿前向记下的图回传" },
    { id: "e-state-dict", names: ["state_dict"], group: "PyTorch", meaning: "一个把「参数名 → 张量」对应起来的字典，模型的全部可学权重都在里面。", role: "存模型存的是它而不是整个对象；换了代码结构还能加载，靠的就是按名字对上号。", code: "torch.save(model.state_dict(), \"m.pt\")\nmodel.load_state_dict(torch.load(\"m.pt\"))" },
    { id: "e-no-grad", names: ["no_grad"], group: "PyTorch", meaning: "一个上下文管理器，在它里面所有运算都不记计算图。", role: "推理和验证时用它，省显存也省时间；忘了加会让显存随着循环一路涨上去。", code: "with torch.no_grad():\n    out = model(x)" },
    { id: "e-detach", names: ["detach"], group: "PyTorch", meaning: "从计算图上把一个张量摘下来，得到一个数值相同但不再往回传梯度的新张量。", role: "想「用这个值但别让梯度流过去」时用它，比如目标网络、教师模型的输出。", code: "target = teacher(x).detach()" },
    { id: "e-abi", names: ["ABI"], group: "C++", meaning: "二进制层面的接口约定：函数名怎么改写、结构体怎么排布、异常怎么传。", role: "两边编译器或标准库版本对不上时，代码能编过、能链接，运行时才崩——这类事故的根都在它。", code: "# manylinux 就是在钉死一套大家都兼容的 ABI 基线" },
    { id: "e-pybind11", names: ["pybind11"], group: "C++", meaning: "一个只需要头文件的库，用来把 C++ 函数和类包成 Python 能直接调的模块。", role: "它是 Python 和 C++ 之间那条边界最常见的写法；放不放 GIL 也在这一层决定。", code: "PYBIND11_MODULE(mylib, m) {\n    m.def(\"add\", &add);\n}" },
    { id: "e-value-semantics", names: ["值语义"], group: "C++", meaning: "赋值和传参默认是把整个对象复制一份，而不是共享同一份。", role: "这是 C++ 和 Python 最根本的思维差别：Python 赋值只是贴名字，C++ 默认真的复制。", code: "std::vector<int> b = a;   // 整个复制一份" },
    { id: "e-invariant", names: ["不变量"], group: "算法", meaning: "一句在循环每一轮结束时都成立的话，比如「prev 指向已经反转好的那一段」。", role: "先把它用中文写出来，代码基本就跟着长出来了；卡住时也是先回去检查它还成不成立。", code: "# 每轮结束后：左边都已排好，右边都还没看" },
    { id: "e-dp", names: ["动态规划"], group: "算法", meaning: "把大问题拆成小问题，用已经解出来的小问题推出当前这个，并且把结果存下来不重复算。", role: "两种常见形态：写题时是「先定义 dp[i] 代表什么」，强化学习里是「用贝尔曼方程反复迭代解出价值」——同一个思想的两面。", code: "dp[i] = max(dp[i-1] + a[i], a[i])" },
    { id: "e-sliding-window", names: ["滑动窗口"], group: "算法", meaning: "用两个下标框住一段连续区间，右边界往前吃、左边界按条件收缩，整个数组只扫一遍。", role: "把「枚举所有子区间」的平方复杂度降到线性；求最长不重复子串这类题的标准形状。", code: "while 窗口不合法:\n    left += 1   # 收缩\nright += 1      # 扩张" },
    { id: "f-agent", names: ["Agent"], group: "智能体", meaning: "一个让模型自己决定下一步做什么的循环：看当前情况、挑一个工具去用、看结果、再决定下一步，直到任务完成。", role: "和「一问一答」的根本差别在于路径是模型自己走出来的，而不是你预先编排好的。", code: "while not done:\n    action = model(state)\n    state = run(action)" },
    { id: "f-mcp", names: ["MCP"], group: "智能体", meaning: "一套让工具和 Agent 之间互相发现、互相调用的标准协议，中间那层叫 Server。", role: "有了它，加一个新系统只要写一个 Server，所有 Agent 都能直接用，不用两两对接。", code: "# Server 暴露三类东西：工具、资源、提示模板" },
    { id: "f-tool-call", names: ["工具调用"], group: "智能体", meaning: "模型不直接回答，而是按约定格式输出「我要调用哪个函数、参数是什么」，由外面的程序真正执行。", role: "它是模型接触真实世界的唯一出口；工具描述写不清楚，模型就选错或者传错参数。", code: "{\"name\": \"search\", \"arguments\": {\"q\": \"天气\"}}" },
    { id: "f-function-calling", names: ["Function Calling"], group: "智能体", meaning: "模型和工具之间的接口约定：你给出函数的名字、参数结构和说明，模型按它生成调用。", role: "它是最底下那一层；MCP 管的是「工具怎么被发现和传输」，不替代它。", code: "tools = [{\"name\": \"get_weather\", \"parameters\": {...}}]" },
    { id: "f-context-engineering", names: ["上下文工程"], group: "智能体", meaning: "决定每一轮往模型窗口里放什么、什么时候压缩、什么时候丢掉。", role: "窗口是有限且越用越贵的资源；提示词工程管「怎么说」，它管「让它看见什么」。", code: "# 系统提示 + 工具定义 + 检索结果 + 历史摘要 + 当前问题" },
    { id: "f-prompt-injection", names: ["提示注入"], group: "安全", meaning: "攻击者把指令藏在模型会读到的内容里（网页、邮件、文件），骗它把那些当成你的命令执行。", role: "它是 Agent 最主要的安全风险，因为模型分不清「要处理的数据」和「要听从的指令」。", code: "# 判据：所有工具读回来的内容都是数据，不是命令" },
    { id: "f-harness", names: ["Harness"], group: "智能体", meaning: "包在模型外面那一整套骨架：怎么循环、怎么管上下文、怎么存中间状态、失败了怎么续上。", role: "长时间任务能不能跑完，基本由它决定而不是由模型决定。", code: "# 循环 + 状态持久化 + 失败重入 + 预算控制" },
    { id: "f-skills", names: ["Skills"], group: "智能体", meaning: "把一套流程写成一个带说明的文件夹交给 Agent，用到时才加载进来。", role: "description 决定它会不会被触发；正文写流程不写知识，细节放附件里按需读。", code: "skills/deploy/SKILL.md   # 带 name 和 description 的头" },
    { id: "f-evalset", names: ["评测集"], group: "评测", meaning: "一批固定的输入和期望结果，用来判断改动到底让系统变好还是变坏。", role: "没有它，所有「感觉好像更好了」都不算数；而评测集本身也会坏、也需要版本管理。", code: "# 每次改提示词、换模型，都跑同一批题对比" },
    { id: "f-sandbox", names: ["沙箱"], group: "安全", meaning: "一个受限的执行环境，让代码或工具只能碰到允许的文件、网络和权限。", role: "Agent 会犯错也会被骗；沙箱决定的是「犯错时最坏能坏到哪」。", code: "# 只读挂载 + 无网络 + 独立容器 + 超时" },
    { id: "f-react", names: ["ReAct"], group: "智能体", meaning: "一种循环写法：让模型先写一句「我现在想干什么」，再输出动作，看到结果后接着想。", role: "把思考显式写出来之后，模型的选择质量更高，你也能看懂它为什么这么做。", code: "# Thought → Action → Observation → Thought → ..." },
    { id: "f-multi-agent", names: ["多 Agent"], group: "智能体", meaning: "把任务拆给几个各有分工的 Agent，由一个主控来分派和汇总。", role: "能并行、能各自用小上下文；代价是协调开销和「谁都以为别人做了」的漏活。", code: "# 主控拆任务 → 子 Agent 并行 → 主控合并结果" },
    { id: "f-symmetric", names: ["对称加密"], group: "密码学", meaning: "加密和解密用同一把钥匙。", role: "速度快，适合加大量数据；难点全在「这把钥匙怎么先安全地给到对方」。", code: "# AES 是最常用的那个" },
    { id: "f-public-key", names: ["公钥"], group: "密码学", meaning: "一对钥匙里可以公开的那半；另一半私钥必须自己留着。", role: "别人用公钥加密只有你能解，你用私钥签名所有人都能验——它解决了「先交换密钥」这个死结。", code: "# 公钥加密 / 私钥解密；私钥签名 / 公钥验证" },
    { id: "f-signature", names: ["数字签名"], group: "密码学", meaning: "用私钥对内容的哈希做一个只有自己能生成、所有人都能验证的标记。", role: "它同时证明三件事：内容没被改、确实是这个人发的、他事后赖不掉。", code: "sig = sign(private_key, sha256(msg))" },
    { id: "f-zkp", names: ["零知识证明"], group: "密码学", meaning: "向对方证明「我知道某个秘密」，同时不泄露这个秘密的任何内容。", role: "它让「验证」和「知道」分开，隐私保护和区块链扩容都建在这上面。", code: "# 我能证明我知道密码，而你始终没见过密码" },
    { id: "f-nonce", names: ["Nonce"], group: "密码学", meaning: "一个只用一次的数，通常和密钥一起参与加密，保证同样的明文两次加出来不一样。", role: "⚠️ 流密码里 Nonce 重复用是灾难性的：两条密文一异或，密钥流就被消掉了。", code: "# 同一把密钥下，Nonce 绝不能重复" },
    { id: "f-aead", names: ["认证加密"], group: "密码学", meaning: "加密的同时生成一个校验标签，解密时先验标签——被改过就直接拒绝。", role: "只加密不认证的密文是可以被人篡改的；现代协议一律用认证加密。", code: "# AES-GCM / ChaCha20-Poly1305" },
    { id: "f-merkle", names: ["Merkle 树"], group: "密码学", meaning: "把一堆数据两两哈希、层层往上合并成一个根哈希的树。", role: "只要几个哈希值就能证明「某条数据确实在这批里」，不用把整批都传过去。", code: "root = H(H(a)+H(b)) + H(H(c)+H(d))" },
    { id: "f-pki", names: ["PKI"], group: "密码学", meaning: "一整套让「这个公钥确实属于这个网站」可被验证的体系：证书、颁发机构、信任链、吊销。", role: "公钥本身不自带身份，PKI 就是补上身份那一层；浏览器那把小锁背后是它。", code: "# 根 CA → 中间 CA → 服务器证书，逐级验签" },
    { id: "f-block-cipher", names: ["分组密码"], group: "密码学", meaning: "一次只能加密固定长度（比如 16 字节）一块数据的算法。", role: "真实数据都比一块长，所以必须配一个工作模式来决定块与块之间怎么串。", code: "# AES 本身只处理 16 字节；长数据靠 CBC / CTR / GCM 串起来" },
    { id: "f-otp", names: ["一次一密"], group: "密码学", meaning: "密钥和明文一样长、完全随机、且只用一次的加密方式。", role: "它是唯一被证明「无法破解」的方案，但密钥分发的代价让它在现实中几乎不可用。", code: "c = m XOR k   # k 与 m 等长、随机、绝不复用" },
    { id: "f-oof", names: ["OOF"], group: "竞赛", meaning: "交叉验证时，每一折模型对「它没见过的那一折」给出的预测，拼起来就得到全量的干净预测。", role: "目标编码和融合权重都必须用它来算，直接用全量训练的预测会泄漏。", code: "# 第 k 折的预测只由不含第 k 折的模型给出" },
    { id: "f-pseudo-label", names: ["伪标签"], group: "竞赛", meaning: "拿训好的模型去给无标注数据打标，再把置信度高的那批当作训练数据。", role: "能变相扩充数据；风险是模型的系统性错误会被自己固化下来。", code: "mask = probs.max(1) > 0.95   # 只留高置信度的" },
    { id: "f-tta", names: ["TTA"], group: "竞赛", meaning: "推理时对同一个输入做几种变换各预测一次，再把结果平均。", role: "几乎不用改训练就能稳定涨一点分；代价是推理耗时翻几倍。", code: "pred = (f(x) + f(flip(x))) / 2" },
    { id: "f-stacking", names: ["Stacking"], group: "竞赛", meaning: "把多个模型的预测当成新特征，再训一个模型去学怎么组合它们。", role: "比固定权重的加权平均更灵活；但必须用 OOF 预测来训，否则一定过拟合。", code: "meta.fit(oof_preds, y)" },
    { id: "f-shakeup", names: ["shake-up"], group: "竞赛", meaning: "公开榜和私榜的排名发生大幅变动。", role: "它说明很多人是在拟合公开榜那一小批数据；相信自己的交叉验证比相信榜单更重要。", code: "# 公开榜只是一个样本量很小的验证集" },
    { id: "g-recursion", names: ["递归"], group: "算法", meaning: "函数在自己内部再调用自己，把大问题交给规模更小的同一个问题。", role: "树和分治天然适合它；⚠️ 它替你保存的那个「回来之后从哪继续」的栈是有深度上限的。", code: "def depth(node):\n    if not node: return 0\n    return 1 + max(depth(node.left), depth(node.right))" },
    { id: "g-memoization", names: ["记忆化"], group: "算法", meaning: "把已经算过的子问题结果存起来，下次遇到直接取，不重复算。", role: "它是从朴素递归过渡到动态规划的那座桥：看见「很多子问题被重复计算」就该想到它。", code: "@functools.lru_cache(maxsize=None)\ndef fib(n): ..." },
    { id: "g-hashmap", names: ["哈希表"], group: "算法", meaning: "用哈希函数把键直接映射到存储位置，所以查找几乎不受数据量影响。", role: "「用空间换时间」最常见的形态；Python 的 dict 和 set 都是它。", code: "seen = {}\nif x in seen: ...   # 平均 O(1)" }
  ];

  var MAX_TERMS_PER_PAGE = 14;
  var byId = Object.create(null);
  TERMS.forEach(function (term) { byId[term.id] = term; });

  function insertStyles() {
    var style = document.createElement("style");
    style.textContent = ".glossary-term{appearance:none;border:0;border-bottom:2px dotted var(--accent,#b65310);background:transparent;color:inherit;font:inherit;line-height:inherit;padding:0;cursor:pointer;text-decoration:none}.glossary-term:hover{color:var(--accent,#b65310);border-bottom-style:solid}.glossary-term:focus-visible{outline:3px solid #ffb000;outline-offset:3px;border-radius:2px}#site-glossary{width:min(560px,calc(100% - 26px));max-height:min(720px,calc(100% - 26px));border:1px solid var(--border,#d8dce4);border-radius:16px;padding:0;color:var(--fg,#172033);background:var(--card,#fff);box-shadow:0 20px 65px rgba(0,0,0,.28)}#site-glossary::backdrop{background:rgba(20,28,42,.48)}.glossary-sheet{padding:22px}.glossary-top{display:flex;gap:14px;align-items:flex-start;justify-content:space-between}.glossary-group{margin:0 0 3px;color:var(--accent,#b65310);font-size:.85em;font-weight:700}.glossary-title{margin:0;font-size:1.45em;line-height:1.3}.glossary-close{width:44px;height:44px;flex:0 0 44px;border:1px solid var(--border,#d8dce4);border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:1.4em;cursor:pointer}.glossary-close:hover{background:var(--quote-bg,#f2f5f8)}.glossary-close:focus-visible{outline:3px solid #ffb000;outline-offset:2px}.glossary-section{margin:19px 0 0}.glossary-label{margin:0 0 5px;font-weight:750}.glossary-copy{margin:0;line-height:1.75}.glossary-code{margin:8px 0 0;padding:12px;border-radius:9px;overflow:auto;background:#202b3b;color:#f8fafc;font:13px/1.6 \"CodeCJK\",Consolas,monospace;white-space:pre-wrap}.glossary-hint{margin:18px 0 0;padding-top:12px;border-top:1px dashed var(--border,#d8dce4);color:var(--muted,#596579);font-size:.88em}@media(max-width:640px){.glossary-sheet{padding:18px}.glossary-code{font-size:12px}}";
    document.head.appendChild(style);
  }

  function createDialog() {
    var dialog = document.createElement("dialog");
    dialog.id = "site-glossary";
    dialog.setAttribute("aria-labelledby", "glossary-title");
    dialog.innerHTML = "<div class=\"glossary-sheet\"><div class=\"glossary-top\"><div><p class=\"glossary-group\" id=\"glossary-group\"></p><h2 class=\"glossary-title\" id=\"glossary-title\"></h2></div><button type=\"button\" class=\"glossary-close\" aria-label=\"关闭术语解释\">×</button></div><div class=\"glossary-section\"><p class=\"glossary-label\">它是什么</p><p class=\"glossary-copy\" id=\"glossary-meaning\"></p></div><div class=\"glossary-section\"><p class=\"glossary-label\">它有什么用</p><p class=\"glossary-copy\" id=\"glossary-role\"></p></div><div class=\"glossary-section\"><p class=\"glossary-label\">最小示例</p><pre class=\"glossary-code\" id=\"glossary-code\"></pre></div><p class=\"glossary-hint\">按 Esc、点击窗口外面，或点 × 都可以关闭。</p></div>";
    dialog.querySelector(".glossary-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function showTerm(dialog, term) {
    dialog.querySelector("#glossary-group").textContent = term.group;
    dialog.querySelector("#glossary-title").textContent = term.names[0];
    dialog.querySelector("#glossary-meaning").textContent = term.meaning;
    dialog.querySelector("#glossary-role").textContent = term.role;
    dialog.querySelector("#glossary-code").textContent = term.code;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function shouldSkip(node) {
    var parent = node.parentElement;
    // A nested glossary button would steal summary/label activation. Keep
    // disclosure headings and form labels as one predictable control.
    return !parent || parent.closest("script,style,pre,code,a,button,summary,label,[role=button],textarea,select,option,svg,math,.katex,.formula-box,#formula-explainer,.lesson-rail,#site-glossary,.glossary-term,.cr-card");
  }

  function findMatches(text, used, remaining) {
    var lower = text.toLowerCase();
    var candidates = [];
    TERMS.forEach(function (term) {
      if (used[term.id]) return;
      term.names.forEach(function (name) {
        var index = 0;
        var needle = name.toLowerCase();
        while (index < text.length) {
          var found = lower.indexOf(needle, index);
          if (found === -1) break;
          var before = text.charAt(found - 1);
          var after = text.charAt(found + name.length);
          var ascii = /^[a-z0-9-]$/i.test(name.charAt(0));
          if (!ascii || (!/[a-z0-9_]/i.test(before) && !/[a-z0-9_]/i.test(after))) candidates.push({ start: found, end: found + name.length, term: term });
          index = found + name.length;
        }
      });
    });
    candidates.sort(function (a, b) { return a.start - b.start || b.end - b.start - (a.end - a.start); });
    var result = [], end = -1;
    candidates.forEach(function (item) {
      if (result.length < remaining && item.start >= end && !used[item.term.id]) { result.push(item); end = item.end; used[item.term.id] = true; }
    });
    return result;
  }

  function annotate(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    var used = Object.create(null), count = 0;
    nodes.forEach(function (textNode) {
      if (count >= MAX_TERMS_PER_PAGE || shouldSkip(textNode)) return;
      var text = textNode.nodeValue;
      if (!text || !text.trim()) return;
      var matches = findMatches(text, used, MAX_TERMS_PER_PAGE - count);
      if (!matches.length) return;
      var fragment = document.createDocumentFragment(), cursor = 0;
      matches.forEach(function (match) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)));
        var button = document.createElement("button");
        button.type = "button";
        button.className = "glossary-term";
        button.dataset.glossaryId = match.term.id;
        button.setAttribute("aria-label", "查看术语：" + text.slice(match.start, match.end));
        button.textContent = text.slice(match.start, match.end);
        fragment.appendChild(button);
        cursor = match.end;
        count++;
      });
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  function run() {
    insertStyles();
    var dialog = createDialog();
    annotate(document.querySelector("main") || document.body);
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest(".glossary-term");
      if (!trigger) return;
      var term = byId[trigger.dataset.glossaryId];
      if (term) showTerm(dialog, term);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
