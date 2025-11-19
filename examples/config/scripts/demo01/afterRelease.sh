#!/bin/bash
set -euo pipefail
DEPLOY_PROJECT_DIR="/data/projects/official-website-v2-master"
echo "Deploy project in ${DEPLOY_PROJECT_DIR}"
if [ ! -d "${DEPLOY_PROJECT_DIR}" ]; then
  echo "Target directory not found: ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
cd "${DEPLOY_PROJECT_DIR}"

# 备份数据库函数
# 参数1: 数据库文件路径
# 参数2: 备份输出目录
backup_db() {
  local db="$1"
  local out_dir="$2"
  local ts
  ts="$(date +%Y%m%d%H%M%S)"
  mkdir -p "$out_dir"
  backup_db_name="prod.db.$ts"
  backup_db_path="$out_dir/$backup_db_name"
  if [ -f "$db" ]; then
    # 检查是否安装了 sqlite3 命令
    if command -v sqlite3 >/dev/null 2>&1; then
      # 如果安装了 sqlite3，使用 sqlite3 的备份命令
      sqlite3 "$db" ".backup $backup_db_path"
    else
      # 否则直接复制数据库文件
      cp "$db" "$backup_db_path"
    fi
   shipit upload
  else
    echo "DB not found: $db"
    exit 1
  fi
}
if [ -f "package.json" ]; then
  backup_db "${DEPLOY_PROJECT_DIR}/prisma/prod.db" "backup"
  pnpm install
  pnpm deploy:prod
else
  echo "No package.json in ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
echo "Deploy done in ${DEPLOY_PROJECT_DIR}"
