# 写作风格入口

_入口 skill：writing-style；负责识别任务与选择规则，不代替用户事实。_

---

先依据本次请求识别操作：从材料起草选 writing-style-draft；修改现有稿件选 writing-style-revise；只检查并建议选 writing-style-review；调整写作规则选 writing-style-feedback。混合请求按明确的交付目标分步处理，不把审查自动变成重写，不把反馈自动变成规则更新。

请 host 选择并加载对应任务 skill，再按本次用途选择并加载一个主文体 skill：工作复盘用 writing-style-work-summary；参会报告用 writing-style-conference-report；学习与机制笔记用 writing-style-technical-note；数值算法与程序映射用 writing-style-numerical-development；回忆、致谢用 writing-style-personal-narrative。

每次使用共同规则及单一主文体，不为覆盖面同时加载所有分支。文体不明确或属于通用写作时只走共同规则，依据实际用途组织，不强行归类。文体明确但对应 skill 未加载时先提示 host 加载，避免假称已经使用。

确认已有事实材料、读者、用途和输出要求；缺项可据输入作保守判断并明示假设，影响事实的空缺标记“[待补：具体信息]”。所有风格行为都保留事实边界，不把原始档案当默认上下文，也不读取无关个人材料。

输出符合任务的正文、修订稿、审查意见或变更草案即可，不额外套入固定结构、口头口诀或相似度分数。只有用户要求并确认的规则变更才进入后续人工维护流程。
