#!/bin/bash
set -euo pipefail
DEPLOY_PROJECT_DIR="${HOME}/Projects/practice/official-website-v2"
echo "Clean old release files in ${DEPLOY_PROJECT_DIR}/src/*"
rm -rf "${DEPLOY_PROJECT_DIR}/src/"*
rm -rf "${DEPLOY_PROJECT_DIR}/"*.zip

