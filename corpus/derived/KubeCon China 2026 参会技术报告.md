# KubeCon China 2026 参会技术报告

## 会议整体观察

![image\.png](图片和附件/image%2013.png)

本次 KubeCon \+ CloudNativeCon \+ OpenInfra Summit \+ PyTorch Conference China 2026 中，与公司当前 Agent 转码及性能优化 工作直接相关的内容主要集中在三个方向：

- 一，Agent 正从“代码生成”走向“基于真实硬件反馈的自动优化”。 最典型的是 Meta/PyTorch 的 KernelAgent，其核心已经不是让大模型“写出一个 Kernel”，而是构建 Plan → Generate → Compile → Validate → Profile → Learn 的完整闭环，通过编译器、Profiler 和真实 GPU 不断迭代代码。

- 二，性能优化正在进一步下沉。 优化目标不再只是算法或 CUDA 语法，而是 Kernel Fusion、访存、launch 次数、Roofline、通信计算融合、拓扑等更底层因素。PyTorch Optimizer 和 NCCL 的两个报告都体现了这一趋势。 

- 三，Agent 优化系统需要“可验证、可度量、可积累”。 可观测性、硬件指标和历史优化经验逐渐成为 Agent 的输入，而不是只依赖 LLM 自身知识。这个方向对我们现有转码 Agent 的架构升级有较强参考价值。

## 重点内容：KernelAgent

KernelAgent 将自己定义为面向 Kernel 优化的 coding harness，支持 GPU、TPU、AMD 等硬件上的 Kernel 设计和调优。其重点不是单次代码生成，而是把专家优化流程固化成 Agent 工作流**。其整体架构分成三层：Agent Infrastructure → Agent Methodology → Output Artifacts**

![image\.png](图片和附件/image%203.png)

其中底层 Agent Infrastructure 提供 LLM、编译、Profiler、GPU Sandbox 和工具调用；中间层把专家经验组织成 Plan\-first、架构分析、Roofline、Schedule Design 等方法；最终输出可以直接落地为生产 Kernel、Benchmark、vLLM Plugin 或 `torch.custom_op`。Agent 能直接调用编译工具、执行 Kernel、读取 Nsight Compute 等性能数据，再根据结果修改实现。KernelAgent 在真正写代码之前，强制 Agent 先生成结构化 Plan，包括：目标硬件 → Baseline → Correctness → Roofline → Schedule Design → Test → Benchmark → Tuning Sweep → Tuning Log。这个机制本身甚至是一个“functional no\-op”，但作用是强制 Agent 在写代码之前思考设计问题，避免在错误的 tiling、IO model 或并行策略上反复编译试错。这对我们的转码 Agent 很有价值。

![image\.png](图片和附件/image%204.png)

KernelAgent 最重要的不是框架概念，而是已经出现了生产级结果。在 KernelBench L1\-L3 的 250 个任务上，其 Triton 生成实现达到 100% correctness；在 H100 上，通过 NCU 驱动的优化，相比默认 `torch.compile` 实现了 1\.56× 几何平均加速，达到 H100 Roofline 的 89%；同时生成的 Kernel 已进入 vLLM 和实际推理代码路径。更值得注意的是其 HillClimb 实验：经过约 5 轮 NCU\-guided optimization，Kernel 时间下降约 40%，相对 eager 的几何平均加速约 3×，并最终带来端到端约 4% MFU 提升。

![image\.png](图片和附件/image%2012.png)

这里体现出一个很重要的趋势：未来转码 Agent 的竞争点，很可能不只是“能不能转换”，而是“能不能自动找到目标硬件上的高性能实现”。KernelAgent甚至明确提出：真正长期有价值的资产并不是一批优化后的 Kernel，而是一个能够跨硬件持续改进的 Agentic Harness。这可能是本次会议对我们最值得关注的结论。

![image\.png](图片和附件/image%209.png)

KernelAgent 已经从 NVIDIA GPU 延伸到 AMD MI350 \+ HIP C\+\+、TPU v7 \+ Pallas，并提出进一步覆盖 MTIA、Embedded Device、Consumer\-grade chip，其目标是把 Agent 做成一个 accelerator\-agnostic optimization inner loop。这和我们的场景非常接近。对于自研硬件转码，不建议让 Agent 只维护：API映射表。更适合形成三层能力描述：

语义层： 原代码想完成什么；
能力层： 目标平台有哪些算子、memory、thread、stream、graph、shared memory 等能力；
实现层： 在现有能力下如何生成并优化目标代码。

这样 CUDA、HIP、自研语言甚至未来汇编后端都可以接入同一个 Agent Harness，而不是每增加一个后端就重新构造一套 Agent。

## PyTorch Optimizer：优化空间不能只看算法

PyTorch Optimizer 的报告提供了一个非常典型的硬件优化案例。AdamW 等 Optimizer 很多时候是 memory\-bound，瓶颈并不是计算量，而是 tensor 在 VRAM 和 SM 之间反复移动。优化主要有两个方向：

- **Horizontal Fusion：** 一次 Kernel launch 处理更多 tensor；

- **Vertical Fusion：** 一个 Kernel 内完成更多操作，再把数据写回 VRAM。

其核心目的都是减少：**Kernel Launch 数量 \+ VRAM ↔ SM 数据往返。**

![image\.png](图片和附件/image.png)

![image\.png](图片和附件/image%202.png)

这件事情对我们的 Agent 很重要，因为它说明：

> **代码等价 ≠ 性能等价。**
> 
> 

即使 Agent 完整地把一个 CUDA 程序转换到目标平台，如果仍然保留大量小 Kernel、冗余数据搬运和不合理的中间结果，转换后的代码依然可能远低于硬件能力。因此后续 Agent 的优化规则中，应该显式加入性能分析的指标，而不能只做 API / Syntax 层转换。

## NCCL Device API：通信本身开始进入 Kernel

![image\.png](图片和附件/image%206.png)

NVIDIA 在新的 NCCL Device API 中，将通信能力进一步开放到 Kernel 内，包括：

**LSA：**Load/Store Accessible Memory
**Multimem：**NVLink SHARP
**GIN：**GPU\-Initiated Networking

![image\.png](图片和附件/image%207.png)

从而允许 GPU Kernel 本身发起远程访问和网络通信。会议中甚至展示了把 Dispatch、FC1、FC2、Combine 融合进一个 Kernel，让一个 tile 在计算的同时继续加载和通信后续 tile。如果我们未来工作覆盖：MoE、多 GPU、集合通信、AI 推理框架，Agent 的搜索空间必须包括：

> **通信模式本身能否被重构，而不只是通信 API 是否能够一一映射。**
> 
> 

即，“CUDA→目标平台”的能力树以后很可能还需要增加 **Communication/Topology 层**。

## 性能 Agent 需要完整的可观测闭环

LLM Inference Observability 的报告提出一个很有价值的观点：GPU Utilization 高，并不意味着 GPU 在做有效计算。GPU A 和 GPU B 都可能显示 90% utilization，但一个在做 Matrix Compute，另一个实际上可能主要等待 NCCL/Data。报告把观测链路分为：

**GPU Hardware → CUDA/NCCL → Host → Kubernetes → Inference Engine → GenAI API → Business。**

![image\.png](图片和附件/image%208.png)

未来 Agent 做性能决策时，最好不要只接受一个：“运行时间 = 3\.2 ms”而应采集一个结构化 Performance Profile，再让 Agent 判断当前代码究竟属于：Compute\-bound / Memory\-bound / Launch\-bound / Communication\-bound。

## 其他会议内容

### Stateful AI Agent Scale\-to\-Zero

这一报告主要讨论 Agent Runtime，而非代码转码。核心问题是 Agent 是有状态长会话，一个 Session 可能对应独立 Sandbox、文件系统、进程及上下文，因此不能像普通 Stateless Service 一样简单 Scale\-to\-Zero。方案是让 Session 成为 Serverless 一等资源，支持 Session Routing、Freeze、Wake\-up、Monitoring，并在 Knative 基础上扩展，而不是重新自建一套平台。与转码本身相关性不高，但如果未来大规模部署 Coding Agent Sandbox，这套思路值得参考。

![image\.png](图片和附件/image%2011.png)

### Agentic AI Self\-Healing Rollouts

IBM/Red Hat 展示了让 Agent 分析 Metrics 和 Logs，参与 Canary Release 判断，甚至提出故障修复方案。最终结论是 AI Agent 可以加入：Monitor → Analyze → Fix → Validate 自动闭环，和我们业务场景不同，但它进一步证明：Agent 的价值不是一次性生成答案，而是进入工程系统的反馈循环。这一思想与 KernelAgent 是一致的。

![image\.png](图片和附件/image%205.png)

### Intel KVShrink

Intel 展示了通过 CPU 侧 DSA/QAT/AMX 对 KV Cache 搬运、压缩及缓存进行硬件卸载。例如利用 DSA 处理大量碎片化 KV 搬运，避免占用 GPU SM；QAT 则用于 KV Cache 无损压缩。报告给出的方案最终形成：GPU HBM ↔ Host DDR ↔ Storage，多级 KV Cache，并通过 vLLM KV Connector 接入。与转码 Agent 直接关系有限，但体现出一个值得关注的方向：

> **优化不一定意味着继续优化 GPU Kernel，也可能通过 CPU / DMA / 专用硬件进行 Offload。**
> 
> 

Agent 的搜索空间最终可能需要覆盖异构系统，而不仅是一个 Kernel。

![image\.png](图片和附件/image%201.png)

### Kubernetes DRA

DRA 的核心变化，是 Kubernetes 从：“我要 N 张 GPU”逐渐走向：“我要哪一种设备、什么属性、什么拓扑，并且设备当前是否健康可用”。即从 Quantity\-based GPU Scheduling 转向 Structured、Partitionable、Observable、Governable 的设备资源管理。对转码 Agent 本身影响较小，但如果未来我们的 Agent 在多种自研芯片/GPU Cluster 上自动调度 Benchmark，DRA 这种硬件能力描述方式值得参考。

![image\.png](图片和附件/image%2010.png)

### Spec\-Driven Evolution：AI Agents 重构K8s

这一报告讨论如何利用具备持久上下文的 AI Agents，加快运营商对 OpenStack/Kubernetes 电信云方案的评估。演讲提出，在保持质量标准的前提下，将需求到技术验证的周期从约 7 个月压缩至 3 个月。核心是让运营商在架构选型、供应商选择和正式集成前，更早获得可审查的技术证据。

工作流由三个 Agent 协作完成：**Requirements Agent** 将规范和需求转化为结构化上下文；**Implementation Analysis Agent** 检查代码与配置，识别实现差距并提出修改建议；**Runtime Evidence Agent** 采集运行时行为和测量数据。三者通过持久化的规则/审查策略、需求/验收标准、结果/证据共享上下文，最终形成包含发现、架构选项、变更建议和验证测试的工程报告。工程师负责审查与决策，供应商及系统集成团队仍负责产品开发和完整系统验收。

报告展示了两个具体案例：

- **Kubernetes 电信 Operator 审查：** Agent 结合代码与实际 Kopf 版本，发现 `kopf.run(finalizer=False)` 使用不受支持的参数，会导致启动时抛出 `TypeError`；同时发现定时器与调和循环可能并发修改同一应用的 HA 主备角色，建议按自定义资源加锁，避免冲突更新。这体现了需求、代码和运行环境上下文对识别深层缺陷的价值。

- **OpenStack Tacker 扩展优化：** 多个 Conductor 重复执行全局 VNF 同步，形成 N 个实例 × M 个 VNF 的冗余扫描。Agent 建议用 Leader Election 将全局扫描从 N×M 降至 M，并针对单 VNF 生命周期操作提出一致性哈希环归属方案。报告展示的针对性验证覆盖领导权、心跳、故障转移和重复工作消除；其测试环境中，全池 CPU 周期耗时从 40\.5 秒降至 13\.5 秒，网络收发量也明显下降。

对我们的转码 Agent，最有参考价值的是将**需求/规范 → 实现检查 → 测试与运行时证据 → 人工决策**固化为工程流程。除代码和 API 映射外，还应持续提供目标硬件约束、编译器与运行库版本、验收标准及历史验证结果，让每项修改建议都能追溯到需求和证据。Agent 的价值由此延伸到更早发现语义差距、并发风险和性能问题，并为工程决策提供依据。

### FlagOS：面向多元 AI 芯片的统一软件栈

FlagOS 面向多种 AI 芯片提供开源、统一的系统软件栈，连接模型、系统与芯片层，目标是降低不同硬件软件生态之间的迁移与维护成本，支持“一次开发，多芯运行”。其核心思路是通过可复用的编译、算子和框架能力，减少模型针对各类芯片重复适配的工作。[项目介绍](https://github.com/flagos-ai/.github/blob/main/profile/README.md)

与我们工作最相关的能力包括：

- **FlagTree：统一编译器。** 基于 Triton 扩展多芯片后端，在统一代码库中提供多后端编译能力，为芯片接入 Triton 生态提供实现参考。[官方仓库](https://github.com/flagos-ai/FlagTree)

- **FlagGems：通用算子库。** 使用 Triton 实现可用于 PyTorch 的高性能算子，通过面向多后端的 Kernel 支撑模型训练与推理，为算子复用和跨平台优化提供基础。[官方仓库](https://github.com/flagos-ai/FlagGems)

- **FlagScale：训练与推理工具。** 通过统一配置和命令行接口整合多个开源引擎，覆盖训练、强化学习和推理，并通过插件承接硬件适配。[官方仓库](https://github.com/flagos-ai/FlagScale)

- **FlagCX：跨芯片通信库。** 对接各厂商原生集合通信库，并提供跨芯片通信能力，支撑同构与异构环境中的分布式计算。[官方仓库](https://github.com/flagos-ai/FlagCX)

对我们的转码 Agent，这套分层方式提供了一个值得借鉴的方向：**将算子语义、编译后端、通信能力和框架集成分别沉淀为可复用能力。** 可以优先评估已有算子与后端的覆盖范围，再让 Agent 针对缺失能力生成实现、执行数值验证并采集性能数据。实际接入时，应以目标芯片的后端支持、算子覆盖和实测性能为依据，逐步形成跨硬件的验证与优化流程。

### 昇腾全栈 Agent 与 Triton\-Ascend：从算子开发到行业部署

昇腾展台展示了覆盖**算子生成 → 模型适配 → 精度与性能调优 → 行业部署**的 Agent 工具体系，强调通过动态工作流、领域知识库和工具调用，将硬件软件栈中的工程经验沉淀为可复用能力。

- **CANNBot：算子生成。** 支持 Ascend C、CATLASS、Triton、TileLang、PyPTO，覆盖环境配置、算子设计、代码实现、测试和文档编写。展板展示已自动生成 80\+ 算子，算子开发工作量由 5 人天降至 2 人天。

- **Model\-agent：模型适配。** 通过动态工作流编排 MCP 工具与领域知识库，并结合 Agent 评测持续沉淀调优经验。展板给出的适配效率案例为从 1 周缩短至 1 天。

- **MindStudio Agent：精度与性能调优。** 将仿真建模、精度调优、量化优化、性能调优和算子开发组织为专门能力，通过 Agent Harness、工具类 Skills 和 CLI/MCP 对接底层工具，支持单卡与集群调试。

- **Solution Agent：行业部署。** 面向 AI Coding、辅助诊断、智能客服等场景，以预置部署方案为起点，经 msModeling 自动寻优，再由 Agent 生成方案并支持一键部署。展板展示内置 300\+ 部署方案，场景化部署周期从双周缩短至一周。

以上规模与效率数字均为现场展板展示口径。Solution Agent 中值得关注的是**方案知识与性能工具协同**：msModeling 官方文档介绍了部署前性能仿真、SLO 约束下的并行策略与 batch 配置搜索，以及真实服务环境中的参数寻优。这为 Agent 提供了方案筛选和性能验证的工具基础。[msModeling 官方说明](https://github.com/Ascend/msmodeling/blob/master/README.md)

另一块展板介绍了 **Triton\-Ascend 的跨平台迁移与算子开发能力**，包括 Triton 社区 out\-of\-tree 后端协作，以及面向推理、训练和推荐场景的算子支持。现场展示的算子覆盖量为 900\+，包括 500\+ 标准算子和 400\+ 大模型算子；优化能力涵盖 Autotune、动静态调度、Cost Model、SuperBlocking、片上缓存复用与访存合并。这体现了高层算子编程与目标硬件编译优化相结合的路线。

![微信图片\_20260916095644\_606\_34\.jpg](图片和附件/微信图片_20260916095644_606_34.jpg)

对我们的转码 Agent，值得借鉴的是将**语言与硬件知识、编译和调试工具、测试及性能数据、历史优化经验**共同纳入工作流。可以围绕算子生成、模型适配、数值验证和性能优化建立可复用 Skills，通过实测反馈积累经验，并逐步将验证范围从单个 Kernel 扩展到模型及部署场景。

## 总结

本次会议对我们最重要的信号不是“Agent 又可以写一种代码了”，而是：

> **AI Coding Agent 正从“代码生成工具”向“基于编译、测试、Profiler 和真实硬件反馈的自动工程优化系统”演进。**
> 
> 

其中 KernelAgent 已经展示了比较完整的技术路线，并开始进入 vLLM 等生产系统；PyTorch Fusion、NCCL Device API 和 Observability 则进一步展示了 Agent 未来需要搜索的优化空间。



