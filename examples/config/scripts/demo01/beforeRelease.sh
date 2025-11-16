#!/bin/bash

# 发布前最常见的是清理旧的发布包
DEPLOY_PROJECT_DIR='/Projects/practice/official-website-v2/'
echo "Clean old release files in $DEPLOY_PROJECT_DIR/src/*"
rm -rf $DEPLOY_PROJECT_DIR/src/*

