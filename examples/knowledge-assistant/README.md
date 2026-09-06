# 企业知识助手：可复现的教学基线

Python 3.12。虚构语料，没有真实客户、账户或收费 API。可以先运行纯标准库流程，再逐层加入 MCP、LangGraph、中文 embedding 与重排。

本项目展示可检查的工程边界：文档版本、ACL、失败任务、检索证据、引用、审批与幂等恢复。它不是经过生产容量和安全验收的产品。

## 1. 五分钟看到结果

下面命令在**本 README 所在目录**运行；从网站下载 ZIP 时，先解压进入 `knowledge-assistant`。

```bash
python lab.py demo
python -m unittest discover -s . -p test_core.py -v
python lab.py inspect corpus/limits.md --chunk-chars 450
python lab.py evaluate --report .runtime/bm25.json
```

预期：12 份文档发布；普通用户无法检索 HR 和租户 B 文档；demo 引用可验证，但会提示相近型号的排序错误；模拟下游创建成功后丢失响应，恢复后只有一张工单。

demo 的批准由本地 `OPERATOR` 夹具执行，便于确定性复现。它没有人工界面、真实用户登录或真实工单 SaaS。

重复 demo 可复用同一数据库与操作号。修改解析器/切块配置后，使用新数据库（如 `python lab.py --db .runtime/new.db demo`）或执行明确的索引版本迁移；不要删除原数据库来掩盖版本冲突。

## 2. 安装可选依赖

Windows PowerShell：

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m unittest discover -s . -p test_protocol.py -v
```

Linux/macOS 把解释器替换为 `.venv/bin/python`。后文 `python` 指安装依赖后的解释器。`requirements.txt` 锁定直接依赖，不声称锁住全部传递依赖；`validation/environment.json` 保存本轮实际包版本。复现该环境时可参考其中的版本，在目标平台重新安装和测试。不要将 Windows 专用依赖强行用于 Linux。

可选 PDF 文本层解析需要另装 `pypdf`。代码会拒绝加密、无文本或稀疏页；没有 OCR、版面恢复及复杂表格能力，也没有 PDF 夹具验收结果。普通 Markdown 的测试通过不能替代 PDF 验收。

## 3. 检索实验

```bash
python lab.py evaluate --neural --rerank --report .runtime/neural.json
python lab.py evaluate --neural --rerank --candidate-k 6 --report .runtime/candidates6.json
python lab.py evaluate --chunk-chars 250 --context-chars 800 --report .runtime/small-context.json
```

首次 `--neural` 下载公开模型权重，不调用收费模型服务。embedding 为 `BAAI/bge-small-zh-v1.5`（512 维、中文 query 前缀），重排器为英文 `Xenova/ms-marco-MiniLM-L-6-v2`。后者用于观察中文迁移失败，不是中文选型推荐。查看模型卡的许可与适用范围；ZIP 不包含权重或运行数据库。

结果包含配置、代码/语料/模型哈希、逐题候选、文档级 Hit/Recall/MRR/二元 NDCG 与延迟。20 题中 16 题有答案，4 题无答案或受限；无答案题的 Recall 留空，候选返回不代表可以回答。公开小开发集没有独立保留集，不要把成绩当生产准确率。

模型权重落在 `.runtime/models`，派生文档向量只保留进程内可见快照。参考实现是精确搜索，没有 ANN 索引、持久化向量数据库或答案缓存。

## 4. MCP 真实传输

```bash
python lab.py init
python mcp_client.py --stdio-db .runtime/lab.db
python mcp_client.py --stdio-db .runtime/lab.db --legacy
```

HTTP 在终端 A 启动：

```bash
python mcp_server.py --db .runtime/lab.db --port 8932
```

终端 B（PowerShell，变量仅在此终端生效）：

```powershell
$env:LAB_TOKEN = python lab.py token --port 8932
python mcp_client.py
python mcp_client.py --legacy
Remove-Item Env:LAB_TOKEN
```

token 是短期本地测试凭证；存储其哈希，验证用户、租户、scope、audience、到期与撤销状态。`auth.example.invalid` 是不会联系的占位 issuer。没有实现 OAuth 授权服务器、浏览器登录、PKCE/回调、刷新与真实 IdP 联调。stdio 则明确使用单一本地身份，不声称有 HTTP 用户认证。

协议测试实际启动 loopback HTTP 与 stdio 子进程，覆盖 SDK 2.1.1 的 2026-07-28 与 2025-11-25。目标第三方宿主、跨语言 SDK、真实反向代理与外部身份平台要单独验收。

只暴露搜索、草稿和执行工具，审批没有交给模型。执行重新检查业务库审批；服务端资源 URI 读取与搜索共享权限规则。

## 5. 持久化工作流

```bash
python framework.py --db .runtime/business.db --checkpoints .runtime/checkpoints.db --thread demo-001
python framework.py --db .runtime/business.db --checkpoints .runtime/checkpoints.db --thread demo-001 --resume yes
```

第一条暂停后退出进程，第二条恢复。拒绝用 `--resume no`；新任务换新的 thread ID。CLI 的 yes 代表本地独立操作者；真正产品必须从认证后的审批入口写入审批记录。

checkpoint 保存图状态，业务库保存当前授权与副作用事实。模拟下游用独立事务和唯一操作号复现响应丢失；没有连接真实外部 API，也没有实现分布式 worker 租约或集群锁。

## 6. 可选真实生成模型

先自行准备本机 Ollama 与支持工具调用的模型，再把名称换成实际已安装的模型：

```bash
python lab.py init
python lab.py agent "XR-200 的额定功率是多少？请引用手册。" --model your-installed-tool-model --operation-id trial-001
```

当前仅实现 localhost 非流式 chat，最多 6 轮、每轮 3 个工具、30 秒默认总预算，以及重复调用检测。只允许搜索与草稿；没有模型审批。测试使用可控消息验证循环与引用，**本轮未运行真实 Ollama 大模型**，也没有测模型攻击成功率。

引用验证只能证明 ID、版本、可见性、原文片段与本次提供证据一致；不能证明答案的语义支持，返回明确标记需要复核。

## 7. 部署练习的范围

提供 Dockerfile 与路径限定的 GitHub Actions 工作流，供后续干净环境验证。当前电脑 Docker daemon 未运行，容器构建/运行与云端 CI 尚未验证；不要把配置文件存在当作部署完成。

```bash
docker build -t knowledge-lab .
docker run --rm knowledge-lab
```

默认只运行无外部服务的 demo。HTTP 服务需持久化业务库、明确绑定地址与资源 audience、TLS/代理、密钥管理、认证与监控；请按教程阶段验收再开放给其他用户。单机 SQLite 不提供横向扩容和生产备份方案。

## 8. 文件职责与验证记录

| 文件 | 职责 |
|---|---|
| core.py | 解析、版本化入库、ACL、检索、引用和指标 |
| workflow.py | 审批、幂等、副作用对账和本地凭证夹具 |
| models.py | 可选真实 ONNX embedding 与重排 |
| agent.py | 有预算的工具循环与可选 Ollama 接口 |
| mcp_server.py / mcp_client.py | 真实协议接入与清理 |
| framework.py | LangGraph 的跨进程暂停恢复 |
| lab.py | 可运行命令与原始评测输出 |
| test_core.py / test_protocol.py | 业务负例、真实传输和恢复测试 |
| corpus/ | 虚构语料、权限 manifest 和公开开发题集 |
| validation/ | 本轮测试、环境与最终测量记录；以记录的范围为准 |

网站教程从 `智能体工程教程/17b-企业知识助手交付项目.html` 进入。完整流程按入库、检索、生成、MCP、审批、框架、交付与岗位分支展开。

### 本轮实测（2026-09-06）

16 道有答案开发题，K=3，candidate K=12，450 字符切块目标、2400 字符上下文预算；Windows 11 / Python 3.12.14 / ONNX CPU、2 线程。单次逐题运行，未控制整机其他负载，尾延迟仅作小样本观察，不是容量或 SLO。

| 路线 | Hit | Recall | MRR | NDCG | 中位耗时 ms | 小样本 p95 ms |
|---|---|---|---|---|---|---|
| bm25 | 1.0000 | 1.0000 | 0.9271 | 0.9457 | 12.8 | 16.0 |
| dense | 1.0000 | 1.0000 | 0.9688 | 0.9769 | 35.1 | 48.0 |
| hybrid | 1.0000 | 1.0000 | 0.9375 | 0.9539 | 30.6 | 45.8 |
| hybrid+rerank | 0.9375 | 0.9062 | 0.8750 | 0.8672 | 552.4 | 1098.8 |

原始记录：[neural-evaluation.json](validation/neural-evaluation.json)。重排的部分中文题退化，且增加延迟，因此这组配置没有被当作成功优化。质量指标来自开发集，未进行真实生成模型的答案准确率测量。

候选量 12→6 与 BM25 上下文预算 2400→800 的单变量实验见 [ablation-summary.json](validation/ablation-summary.json)，各自保留逐题原始报告。小语料上没有改善也如实记录，不能据此推断生产参数不敏感。
