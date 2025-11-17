#!/bin/bash
set -euo pipefail
DEPLOY_PROJECT_DIR="/data/projects/official-website-v2-master"
echo "Clean old release files in ${DEPLOY_PROJECT_DIR}/src/*"
rm -rf "${DEPLOY_PROJECT_DIR}/src/"*
rm -rf "${DEPLOY_PROJECT_DIR}/"*.zip

