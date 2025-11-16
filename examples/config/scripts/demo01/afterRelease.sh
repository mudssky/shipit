#!/bin/bash

# 发布后执行部署脚本
DEPLOY_PROJECT_DIR='/Projects/practice/official-website-v2/'
echo "Deploy project in $DEPLOY_PROJECT_DIR"
cd $DEPLOY_PROJECT_DIR
pnpm deploy:prod
echo "Deploy done in $DEPLOY_PROJECT_DIR"
