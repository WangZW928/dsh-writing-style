# AMReX开发中的AI助力总结

# 前言

目前我使用AI的方式有两种：Chat与Agent，前者用来做长上下文的文本对话，后者用来做代码开发与本地环境构建，这两种方式对于绝大多数开发工作都有效率上的明显提升，AMReX开发工作也不例外。本文主要对我当下工作模式（内网AMReX开发）中，如何使用AI，进行一些思考和总结。

# AMReX开发工作模式

笼统来讲，AMReX的开发工作是在以下三个部分的基础上展开的：AMReX框架，SCALE编程，计算芯片架构。

## AMReX框架

学习AMReX框架，是开发工作开始的基本。其内容包括AMReX框架的源代码设计方案，所使用的C\+\+高级语法，设备端代码，以及AMReX的数值算法等。这些内容是成熟的，利用AI的chat模式，能够快速进行学习，甚至能够一举反三，在这个阶段，AI能够带来效率上的大幅提升。

## SCALE编程

SCALE的编程环境是在内网开发，目前工具链提供了类似于CUDA的编程方式（N模式）。因为现有的大模型（ChatGPT5\.6sol）已经训练了大量历史中的CUDA优质代码，所以对于SCALE的入门代码（玩具级代码）能够进行助力，因为受限于内网开发，这种方式的助力还是以chat为主。但是请注意，**如果利用AI来code工业软件级的高性能SCALE代码是绝对不可能的，我认为主要原因来自于三点：**

**1\. **SCALE的API集合并不完备（有些有且可用，有些有但不可用，有些甚至不支持），这部分的内容边界需要开发人员手动测试，AI没有相关的先验知识，并且SCALE平台目前还不成熟，前后版本更新迭代较大；

**2\.** SCALE 和 CUDA 编程形式上可以类比，但是设计内核完全不同：SCALE是SIMD代码，且没有Cache，**spu每次launch**都需要从global memory读取数据，存在大量的LS代价，想要提高效率要尽可能做DM常驻的内存设计，这对CFD这种全局迭代的计算程序，困难极大，且这部分内容是空白的，难以AI助力，这与CUDA两级缓存架构下的内存设计完全不同；

**3\. **自研编译器的优化效率存在未知边界，即这部分的代码（C\+\+异构代码）写完之后，需要开发人员手动做效率统计，然后尽可能的手动压榨效率，到底在SCALE架构上，什么样的计算任务代码（不同于2所说的内存设计）才是当前编译器下，编译后可以运行的最好代码？AI同样没有先验知识，这是难以助力的。

## 计算芯片架构

开发人员对公司的芯片架构进行理解和学习，是开发适配芯片的高性能代码不可缺少的一环节。利用AI的chat功能，能够学习基本的芯片知识：pipeline，CPI，Branch，ALU，寄存器，memory等等，甚至通过本地的agent能够run一些经典的硬件开源项目：[github\.com](https://github.com/adam-maj/tiny-gpu)；[Home \| nand2tetris](https://www.nand2tetris.org/)，利用AI能够较大提升硬件架构的学习速度。

# AI助力部分

在叙述第二章内容时，已经穿插讲了在什么模块，AI能够提供什么帮助。在这里作总结：

|**工作环节**|**AI助力程度**|**AI助力方式**|
|---|---|---|
|AMReX源代码学习|🌟🌟🌟🌟|Chat|
|AMReX的单元测试|🌟🌟🌟🌟|Chat\&Agent|
|SCALE编程入门|🌟🌟🌟|Chat|
|高性能SCALE开发|🌟|Chat|
|学习芯片架构|🌟🌟🌟|Chat\&Agent|

作为开发任务来讲，对于Agent的使用，目前不足够。

# 总结与思考

这里讲一些，这段时间使用AI进行开发工作的个人感受。

## 任务分类

在利用AI开展工作前，我认为先对任务进行分类是比较好的，哪些问题是有先验知识的，哪些问题是没有先验知识的，并挑选合适的解决方式：Chat或者Agent。

## 建立工作流

这里的工作流可以等效为Agent的skill。在利用AI的过程中，总结一套自己的工作流水线，一来能够产生稳定可控的结果，二来即使后面换了Agent，也能够快速复用。比如我在阅读AMR相关的论文中，总结了一个 看论文 的skill（paper\-reader），见链接：

[https://clawhub.ai/wangzw928/skills/paper-reader]()

```C++
DOI / arXiv / PDF 入口
    ↓
[0] 查重 → 重复？→ 终止，提示文件路径
    ↓
[1] 获取论文元数据（标题、作者、期刊、摘要）
    ↓  ← 失败即终止
[2] JARVIS 生成初稿 .md → 存入仓库对应分类
    ↓
[3] Codex 价值评估 ← 若有 --精读 flag 则跳过
    ↓              ↓
  精读(≥3)    粗读(<3) → JARVIS 标记粗读 → 写文件 → commit/push → 结束
    ↓
[4] Codex 精读补充（公式/代码梳理）
    ↓
[5] JARVIS 更新 CODEX_DEEP_READ.md
    ↓  (默认追加；若 --重排 则全面重排 Tier)
[6] Kimi Code review（公式推导/代码流程/语法/逻辑/提问）
    ↓
[7] JARVIS git commit + push → 完成通知
```

另外，我在刚开始移植AMReX的时候，也总结了一个用来改写SCALE代码的skill，但是因为效果甚微（用这个skill写一些玩具代码也许可行，但是对开发高性能代码几乎没有帮助），所以没有迭代更新了，具体见：

[SCALE\_skills\.zip](图片和附件/SCALE_skills.zip)

```YAML
name: amrex-scale
description: "AMReX→SCALE/Aurora 移植助手：架构知识库 + 代码实例 + 移植工作流"

**# AMReX → SCALE/Aurora 移植助手**

**## 知识库位置**

```
/Users/marcus/AgentFlow/project/amrex/Src/Base/_Base_Scales/
```

**### 核心文档**
- `SCALE_AMReX_Porting_Integration.md` — 总文档（13章）：架构概览、CUDA差异表、已移植组件、Reduction策略、实例分析、路线图、14项风险、11项难点、58个API对照

**### 代码实例（同目录下）**
- `vadd/` — 基础向量加（DMA + MPU 模式验证）
- `2DHeat/` — 完整 AMReX-like 应用（ParallelFor2D、Jacobi、Reducer）
- `reduceSum/` — 两条规约路径（MPU专用 + AMReX-like SPU通用）
- `fold_lambda/` — C++17 fold expression 验证

---

**## 源码目录**

```
/Users/marcus/AgentFlow/project/amrex/amrex-preprocess/    ← 移植工作目录（精简版，日常使用）
/Users/marcus/AgentFlow/project/amrex/                      ← 完整 AMReX 源码（一般用不到，仅参考）
```

移植工作的目标文件在 `amrex-preprocess/` 中，是完整源码的精简版本。需要对照原始实现时才去完整源码树查找。

---

**## 移植策略：SPU 优先**

****默认走 SPU 路径****，因为 SPU 可以直接访问 DDR，对 AMReX 现有代码改动最小。

****只有满足以下条件时才考虑 MPU 路径****，且需向 master 说明理由：
1. 操作数是****静态偏移****（±1 等编译期常量），不是动态计算出的偏移
2. 数据连续且规则，适合向量化
3. 是已知的性能热点

****判断规则****：
- Base 目录中绝大多数是 (±1) 静态偏移 → 可考虑 MPU
- Amr/EB 等目录中动态偏移居多 → 直接 SPU lambda，不折腾

---

**## 移植检查清单**

每移植一个文件/函数时，按此顺序检查：

```
□ 1. API 可用性    → 查 §13 CUDA↔SCALE 对照表，确认依赖的 CUDA API 有 SCALE 对应物
□ 2. 依赖分析      → 这个文件 #include 了什么？依赖链上有无已知阻塞项（§12）
□ 3. 线程上限      → block size 是否 ≤ 128？如有 256/512 需重设（§2.2）
□ 4. atomic 替代   → 是否依赖 atomicAdd 等？如是，改用两阶段规约（§5）
□ 5. warp 操作     → 是否用了 __shfl_* / __ballot？如是，重写为无 warp 版本
□ 6. 随机数        → 是否依赖 curand？如是，标记为 P2 阻塞（§12 #3）
□ 7. fallback 宏   → 为新平台提供 #ifdef SCALE / #else 分支
□ 8. 测试          → 写独立 host 端测试
```

---

**## 常见任务模式**

**### 分析某个文件能否移植**
1. 在 `amrex-preprocess/` 中找到目标文件
2. 列出所有 CUDA API 调用和依赖
3. 逐项查 §13 对照表和 §12 难点登记
4. 输出结论：可直接移植 / 需修改 / 当前阻塞

**### 设计新的 kernel**
1. ****默认走 SPU****：让 SPU 直接读写 DDR，lambda 形式
2. ****如确需 MPU****（向 master 说明理由后）：
   - 设计 DMA staging：`DDR → DM(__mem0~4__) → MPU 向量计算 → DM → DDR`
   - 参考 `vadd/kernel.sc` 的 memcpy_async + barrier + MPU + sync 模式
   - block 线程数上限 128

---

**## DMA+MPU 代码模板**

```cpp
// 模板：SPU kernel 中调用 MPU 的 DMA staging 模式
// 参考 _Base_Scales/vadd/kernel.sc

__global__ void my_kernel(__DDR T* in, __DDR T* out, int length)
{
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    const int num_per_thread = 256;  // 每 thread 处理元素数

    auto block = cooperative_groups::this_thread_block();
    using barrier_t = scale::barrier<scale::thread_scope_thread>;
    barrier_t bar;
    init(&bar, 1);

    __mem0__ T input_buf[num_per_thread];   // DDR → DM staging
    __mem1__ T output_buf[num_per_thread];  // MPU 计算结果

    if (tid * num_per_thread < length) {
        if ((tid + 1) * num_per_thread <= length) {
            // Step 1: DDR → DM
            memcpy_async(block, input_buf, in + tid * num_per_thread,
                         num_per_thread * sizeof(T), bar);
            bar.arrive_and_wait();

            // Step 2: MPU 向量计算
            my_mpu_func((v16s32*)input_buf, (v16s32*)output_buf,
                        num_per_thread / 16);
            MPU_SYNC();

            // Step 3: DM → DDR
            memcpy_async(block, out + tid * num_per_thread, output_buf,
                         num_per_thread * sizeof(T), bar);
            bar.arrive_and_wait();
        } else {
            // 尾部不完整数据：SPU 直接处理
            for (int i = tid * num_per_thread; i < length; i++) {
                out[i] = in[i];  // 替换为实际计算
            }
        }
    }
}
```

---

**## 关键约束速查**

| 约束 | 数值/状态 |
|------|----------|
| block 最大线程数 | 128 |
| warpSize | 1（无 warp 概念） |
| SPU→MPU 参数上限 | 8 scalar + 8 vector |
| MPU 访问 DDR | ❌ 不允许 |
| atomic 操作 | ❌ 不支持 |
| `__DDR` 结构体整体赋值 | ⚠️ 可能失败，用逐成员写入 |
| `__constant__` | per-block，非 CUDA global |
| CUDA Graph | ❌ 不支持 |
| 内存栅栏 | ❌ 编译器无法实现 |
| 随机数 (curand) | ❌ 仅双精度均匀分布可用 |
```

## 费用

随着DeepSeek在8月17号涨价后，API的价格是在Agent使用流程中的一个沉重负担，即使是简单任务所消耗的费用也是难以忽略的。



