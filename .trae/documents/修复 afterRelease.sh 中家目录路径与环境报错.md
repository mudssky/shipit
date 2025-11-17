## 问题定位
- `cd: ~/Projects/practice/official-website-v2: No such file or directory`
- `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`（在 `/home/xhgj` 找不到 `package.json`）
- `~/.profile: /home/xhgj/.cargo/env: No such file or directory` 的噪声提示

## 根因分析
- `afterRelease.sh` 中 `DEPLOY_PROJECT_DIR='~/...'` 使用了单引号，导致 `~` 不进行家目录展开；`cd` 实际尝试进入字面路径 `~/...` 从而失败。
- `cd` 失败后，`pnpm deploy:prod` 在当前目录（`/home/xhgj`）执行，因此报 `package.json` 不存在。
- 运行钩子时 Shell 加载了 `~/.profile` 或通过 `BASH_ENV` 注入环境；其中无条件 `source ~/.cargo/env`，但该文件不存在，产生提示；此提示不影响发布，但会干扰输出。

## 修复方案
- 使用 `HOME` 环境变量替代 `~` 并正确引用：`DEPLOY_PROJECT_DIR="$HOME/Projects/practice/official-website-v2"`。
- 在 `cd` 之前校验目标目录存在；不存在则明确退出并给出提示。
- 进入目录后再校验 `package.json` 是否存在，避免在错误目录下执行 `pnpm`。
- 保持脚本可移植与健壮：开启 `set -euo pipefail`，对变量与路径统一加双引号。
- 可选（减少噪声）：在用户主机的 `~/.profile` 中将 `source ~/.cargo/env` 改为有条件加载：`[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"`。

## 拟修改脚本（afterRelease.sh）
```
#!/bin/bash
set -euo pipefail
DEPLOY_PROJECT_DIR="${HOME}/Projects/practice/official-website-v2"
echo "Deploy project in ${DEPLOY_PROJECT_DIR}"
if [ ! -d "${DEPLOY_PROJECT_DIR}" ]; then
  echo "Target directory not found: ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
cd "${DEPLOY_PROJECT_DIR}"
if [ -f "package.json" ]; then
  pnpm deploy:prod
else
  echo "No package.json in ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
echo "Deploy done in ${DEPLOY_PROJECT_DIR}"
```

## 关联脚本检查（beforeRelease.sh）
- 若存在 `~/...` 写法，同样替换为 `"$HOME/..."`，并在删除/清理时使用带引号的路径以避免意外通配。

## 验证步骤
- 在 Linux 目标机确认目录存在：`/home/xhgj/Projects/practice/official-website-v2`。
- 手动执行：`bash ./scripts/afterRelease.sh`，观察：
  - 正确打印目标路径为 `/home/xhgj/...` 而非含 `~`。
  - 无 `cd` 失败与 `pnpm` 找不到 `package.json` 的报错。
- 若仍有 `~/.profile` 的 `cargo` 提示，在该机 `~/.profile` 中应用条件加载行。

## 兼容性与影响
- 仅修改部署脚本，不影响 Shipit 业务逻辑。
- 使用 `HOME` 更适配不同 shell 环境；在 Windows/WSL 或 Git Bash 下也更稳定。

请确认后我将按上述方案更新脚本并进行一次本地验证。