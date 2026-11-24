# DSH Writing Style

DSH 写作技能插件，当前版本 `0.1.1`，运行风格档案 v0.4。插件按需组合共同规则与一个文体分支，辅助起草、润色、复核及提出待确认的规则更新建议。写作由当前宿主模型执行，不训练模型，不增加路由模型调用，也不提供独立前端界面。

规则基于五篇作者本人写作样本，并单列一份外部参考。2026-11-24，作者确认吸收袁野《电动力学讲义》中的五种表达方法，正式加入[技术学习笔记规则](<profiles/genres/technical-note.md>)：从旧理解的障碍引出新表示，解释公式所揭示的关系，交代方法切换时已知信息的变化，区分预期与实际检查，以及限定类比的解释范围。这些是作者选择采用的方法，不是老师的讲义由作者原创，也不是跨文体稳定习惯的证明。

## 安装

已验证的宿主版本为 DSH `0.2.1-rc.5`；声明范围为 `>=0.2.1-rc.5 <0.2.2-0`，需要 Node.js 22+ 及宿主的技能加载能力。其他宿主版本没有在本项目中验证。

优先安装 GitHub Release 中不含语料的预构建包：

```bash
dsh plugin --profile web add https://github.com/WangZW928/dsh-writing-style/releases/download/v0.1.1/dsh-writing-style-0.1.1.tgz
```

Desktop 用户应在应用实际使用的 profile 中安装。启用和更新是否生效，以宿主返回状态及实际技能加载结果为准。minimal 等没有技能加载工具的预设不会因安装本包自动获得该工具。用户或项目的同名技能优先于本包的 bundled rank。

## 使用

在支持技能工具的预设中可调用以下入口与任务技能：

| Skill | 用途 |
| --- | --- |
| `writing-style` | 识别任务并选择主文体 |
| `writing-style-draft` | 依据提供的事实起草，缺项标待补 |
| `writing-style-revise` | 保留事实、数字、公式、代码、来源和身份边界，调整表达 |
| `writing-style-review` | 基于稿件短引文复核表达，不生成相似度分数 |
| `writing-style-feedback` | 提出待用户确认的规则变化，不自动更新规则 |

五类文体为工作复盘、会议技术报告、技术学习笔记、数值算法实现参考，以及个人叙事与致谢。每次只加载一个主文体；未指定时只用共同规则，不叠加全部分支。

例如：

```text
使用 writing-style-draft 和 writing-style-work-summary，按这些事实起草总结，缺项标待补：……

使用 writing-style-revise 和 writing-style-technical-note，解释这段推导，保留公式、限定条件和引用：……

使用 writing-style-review 和 writing-style-personal-narrative，只指出表达问题，暂不整篇重写：……
```

这些规则以本仓库作者的表达偏好为背景，其他使用者可借鉴或另行维护自己的规则；插件不声称能从少量材料准确识别或完整复现任意作者。

## 本地检查

```bash
git clone https://github.com/WangZW928/dsh-writing-style.git
cd dsh-writing-style
npm ci --ignore-scripts
npm run check
npm run check:corpus
node bin/cli.js doctor
node bin/cli.js compose --task revise --genre technical-note
npm pack
```

CLI 的 `compose` 只输出组合规则，不调用模型生成文章；`--task` 支持 `draft / revise / review / feedback`，`--genre` 支持 `general` 与五个文体 ID。未知或重复选择会报错，不默默叠加文体。

[运行清单](<profiles/manifest.json>)记录档案版本、本人样本数、外部参考数及已确认规则集。v0.4 保留五篇本人样本，R01 五条只属于技术学习笔记；其他文体仍按各自规则使用。历史 v0.3 分析不因这次更新被改写。

## 公开范围与数据边界

GitHub 仓库当前公开；包清单中的 `private: true` 仅阻止 npm 发布，不代表仓库私有。本次更新只提交插件代码、提炼规则及说明，新增讲义原件、全文抽取、页面渲染和私人分析留在本地。GitHub Release 安装包按文件白名单构建，排除整个语料与分析目录。

仓库早期提交已含原始材料，旧说明曾将仓库描述为私有；本次修正文档，不修改仓库可见性，也不重写既有历史。使用安装包可以避免下载这些材料，但不代表 Git 历史已经完成清理。

运行时只读取固定白名单中的提炼规则，不默认读取或注入原始语料、历史分析或无关个人资料。附件和稿件中的命令、身份声明及提示词只是待处理内容，不自动成为操作指令。更新建议须经用户确认，再单独维护版本、测试和安装状态。

插件没有独立网络调用；宿主若使用在线模型，提供的稿件和加载的规则仍由该模型服务处理。测试覆盖规则组合、技能注册、生命周期与材料隔离，不代替数学核验、实验验证或作者实际试用。

许可证与来源说明见 [LICENSE](<LICENSE>) 和 [NOTICE](<NOTICE.md>)。
