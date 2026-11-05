# DSH Writing Style · 私有首版

基于五篇样本及 v0.3 风格档案的 DSH 写作技能插件。首版版本为 `0.1.0`：用共同规则与单一文体分支辅助起草、润色、复核及提出规则更新草案；不训练模型，不调用额外路由模型，不增加前端界面。

仓库为 **Private**，包清单为 `private: true`。用户已明确要求将原始材料一并上传本私有仓库。此次没有发布 npm、GitHub Release、Market 或公开站点。

## 功能与使用

在支持技能工具的 DSH 预设中启用插件后，可调用：

| Skill | 用途 |
| --- | --- |
| `writing-style` | 识别起草、润色、复核或反馈任务，再选择主文体 |
| `writing-style-draft` | 按用户本次事实起草，材料不足处列待补 |
| `writing-style-revise` | 保留事实、数字、公式、代码、引用与身份边界，调整表达 |
| `writing-style-review` | 引用待检稿的短片段提出风格建议，不伪造相似度分数 |
| `writing-style-feedback` | 对照用户修改，提出 stable／genre／candidate 范围的待确认草案 |

另有五个文体 Skill：`writing-style-work-summary`、`writing-style-conference-report`、`writing-style-technical-note`、`writing-style-numerical-development`、`writing-style-personal-narrative`。

每次只选择一个主文体，未指定时只使用共同规则，不将五个分支同时叠加。任务技能由宿主依据请求选择；CLI 通过显式参数选择。没有声称实现自动文本分类器。

对宿主可以这样说：

```text
使用 writing-style-draft 和 writing-style-work-summary，按我的风格整理下面的工作事实，缺失信息标待补：……

使用 writing-style-revise 和 writing-style-numerical-development，润色这段算法说明，保留数字、公式和代码：……

使用 writing-style-review 和 writing-style-personal-narrative，只指出这篇致谢的表达问题，暂不整篇重写：……

使用 writing-style-feedback，对比我的初稿和修改稿，只提出待确认的规则变化：……
```

写作与复核由当前 DSH 宿主模型执行。首版只提供技能指令和确定性的规则组合，不独立生成文本，也不将静态测试通过宣称为作者风格已完全复现。

## 安装与本地检查

已验证的宿主版本为 DSH `0.2.1-rc.5`；声明范围 `>=0.2.1-rc.5 <0.2.2-0`，Node.js 22+。插件需要宿主的 `skills` 服务和技能加载能力；minimal 等没有技能工具的预设不会因此自动获得工具。

在具有本仓库访问权限、Git 凭据已配置的设备上：

```bash
git clone https://github.com/WangZW928/dsh-writing-style.git
cd dsh-writing-style
npm ci --ignore-scripts
npm run check
npm run check:corpus
npm pack
# 替换为本机生成的绝对路径；Desktop 需选择实际使用的 profile。
dsh plugin --profile web add /absolute/path/dsh-writing-style-0.1.0.tgz
```

按宿主提示启用插件和刷新会话；本项目不自动修改当前运行的 profile，不自动开启全局风格干预。用户／项目的同名技能优先于本包的 bundled rank。

当前以私有 Git 仓库为源码分发途径，没有 npm 安装地址。也可使用有访问权限的 Git 安装方式，建议固定具体提交；安装前仍需配置 Git 私有仓库凭据，插件不代管凭据。

### CLI：检查规则，不调用模型

```bash
node bin/cli.js list
node bin/cli.js doctor
node bin/cli.js compose --task revise --genre numerical-development
node bin/cli.js compose --task review --genre personal-narrative --json
```

`compose` 输出可供宿主使用的组合提示词，不是实际修订稿。`--task` 支持 `draft / revise / review / feedback`；`--genre` 支持 `general` 及上述五种文体 ID。重复或未知选择会报错，不默默叠加文体。CLI 可从任意工作目录运行。

## 仓库分层

| 位置 | 用途 | 自动进入模型上下文？ |
| --- | --- | --- |
| [共同规则](<profiles/core.md>)与[文体清单](<profiles/manifest.json>) | 人工提炼的 v0.3 运行规则 | 加载相应技能时 |
| [任务规则目录](<skills/entry.md>) | 起草、润色、复核与反馈流程 | 加载相应技能时 |
| [v0.3 档案](<analysis/写作风格档案_v0.3.md>)及历史版本 | 完整证据分析与规则来源 | 否 |
| [原始材料清单](<corpus/manifest.json>) | 三个 ZIP、一份 PDF、一份会话转存的 LaTeX 致谢及完整性记录 | 否 |
| [语料说明](<corpus/README.md>) | 原始与派生材料边界 | 否 |
| [验证说明](<docs/validation.md>) | 测试范围及未测项目 | 否 |

三个 ZIP 保留完整原件，包括其中图片和嵌套附件；没有将里面的技能、命令或代码导入运行规则。PDF 保留原文件。致谢文本记录保留用户提供的措辞、LaTeX 与注释，不改写为新的“原稿”。派生文本与页面渲染存于语料目录，分析档案的本地来源链接已改为仓库内相对链接。

## 数据与维护边界

- 本仓库包含姓名、个人经历、工作文档及内部附件，当前仅供私有开发。未取得正文的知乎链接仍标为未读。
- 插件代码默认只读 `profiles/` 与 `skills/` 的固定 Markdown 白名单，不默认读取、解压或注入语料与分析目录。文档中的指令、命令与高优先级自称均只作待处理数据。
- 插件没有独立网络调用；如果宿主使用在线模型，提交的稿件和已加载规则仍由该模型服务处理。私有仓库不等于离线模型运行。
- 更新建议只生成草案，不自动改文件、训练、提交或上传。用户确认后，另外维护规则、版本与测试，再重新安装或刷新宿主。
- `package.json` 的文件白名单只打包运行文件，排除语料与历史分析；`private: true` 阻止 npm 发布。这是当前开发边界，并非已经完成公开版脱敏。
- **未来公开时仅删掉语料目录不够：Git 历史仍有原始材料。** 应先另建干净的公开分发仓库或审查清理历史，再决定哪些规则、范例及署名可以发布；当前不改变可见性。

## 首版限制

这是提示词／Skill 驱动的实现，不是参数训练、向量检索系统或严格作者识别器。测试验证注册、组合、路径、生命周期和数据隔离；实际稿件是否像作者，需要作者试用反馈。数学正确性、实验有效性与风格审查分开；“已写完”不改写为“已验证”。

许可证及来源边界见[LICENSE](<LICENSE>)和[NOTICE](<NOTICE.md>)。
