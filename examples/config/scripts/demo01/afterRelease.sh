#!/bin/bash
set -euo pipefail
DEPLOY_PROJECT_DIR="/data/projects/official-website-v2-master"
echo "Deploy project in ${DEPLOY_PROJECT_DIR}"
if [ ! -d "${DEPLOY_PROJECT_DIR}" ]; then
  echo "Target directory not found: ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
cd "${DEPLOY_PROJECT_DIR}"
if [ -f "package.json" ]; then
  pnpm install
  pnpm deploy:prod
else
  echo "No package.json in ${DEPLOY_PROJECT_DIR}"
  exit 1
fi
echo "Deploy done in ${DEPLOY_PROJECT_DIR}"
