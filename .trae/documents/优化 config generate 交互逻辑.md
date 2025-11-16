## 现状与问题
- 交互仅用于模板选择，未覆盖输出路径与覆盖确认（src/commands/config/index.ts:181-218）
- 模板匹配为精确名称/文件名，未做大小写/部分匹配与路径输入（src/commands/config/index.ts:189-195）
- 当模板数量较多时无关键词预过滤；仅以名称列表呈现（src/utils/interactive.ts:47-63）
- 若仅一个模板仍进入交互列表，影响效率（src/commands/config/index.ts:205-215）
- 交互开关在函数内部判定，未统一贯穿 generate 的后续步骤（src/commands/config/index.ts:199-205）

## 优化目标
- 安全：避免无提示覆盖已有文件
- 易用：支持模糊匹配/路径输入；少模板时跳过多余交互
- 清晰：在非交互环境给出明确的自动选择提示

## 具体改动点
1) 统一交互开关计算
- 在 action 入口统一计算 `interactiveEnabled = options.interactive ?? (process.stdout.isTTY && !process.env.CI && !options.noInteractive)` 并传递给后续流程，保持与 release 命令一致（参考 src/commands/release/index.ts:60-63,315-317）

2) 模板选择增强
- 支持大小写不敏感与部分匹配；优先 exact 命中，其次 `includes` 命中（src/commands/config/index.ts:189-195）
- 支持 `--template` 直接传入绝对/相对路径：若 `fs.existsSync(nm)` 且为文件，直接选用该文件（新增路径判断）
- 当 `templates.length === 1` 时，直接返回该模板，跳过交互（src/commands/config/index.ts:205-215）
- 当模板数量超过阈值（如 15）时，先通过 `inputText('请输入过滤关键词(可空)')` 进行一次预过滤再调 `pickFromList`（参考 release 列表过滤：src/commands/release/index.ts:93-101）

3) 输出路径与覆盖确认（交互）
- 在 `interactiveEnabled` 且未指定 `--out` 时，使用 `inputDir` 询问输出路径，默认 `shipit.config.ts`（src/utils/interactive.ts:18-35）
- 若目标文件已存在且未指定 `--force`/`--yes`，使用 `confirm('文件已存在，是否覆盖？', false)` 进行确认（src/utils/interactive.ts:3-16）

4) 选项补充
- 增加 `-y, --yes`（自动确认）与 `-F, --force`（无条件覆盖）选项（src/commands/config/index.ts:99-105 处追加）
- `--list` 增加 `--json` 支持以便脚本消费（列表逻辑处追加）

5) 目录探测优化
- `resolveExampleDir` 遍历候选目录时同时验证是否存在 `.ts/.js` 模板文件；若空目录则继续下一个候选，避免后续 `listTemplates` 空列表错误（src/commands/config/index.ts:136-168）
- 非交互环境时，打印提示：`非交互环境，自动选择模板: <name>` 以提升可理解性

## 验证策略
- 单元测试（tests/unit）：
  - `pickTemplate` 匹配优先级：exact > 部分 > 默认模板；大小写不敏感
  - 路径输入选择：传入现有文件路径时直接选用
  - 单模板跳过交互与大列表预过滤
- 集成测试（tests/integration）：
  - 非 TTY 环境：`--interactive` 未指定时自动选择模板并输出
  - 交互模式：模拟 inquirer，验证输出路径询问与覆盖确认行为
- 质量脚本：`pnpm qa` → `pnpm test` → `pnpm build`

## 变更影响
- 向后兼容：默认行为不变；仅在交互开启或提供新选项时触发新增逻辑
- 风险控制：所有新增交互可通过 `--yes`/`--force` 或 `--no-interactive` 绕过