#!/bin/bash

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始 macOS 打包流程"
echo "=========================================="

# 检查是否安装create-dmg，如果没有则尝试安装
if ! command -v create-dmg &> /dev/null; then
    echo "create-dmg not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "错误: 未找到 Homebrew，请先安装 Homebrew"
        echo "访问: https://brew.sh"
        exit 1
    fi
    brew install create-dmg
fi

echo ""
echo "步骤 1/3: 编译 macOS 应用..."
wails build -platform darwin

if [ ! -d "build/bin/lottery.app" ]; then
    echo "错误: 编译失败，未找到 build/bin/lottery.app"
    exit 1
fi

echo ""
echo "步骤 2/3: 准备安装包目录..."
mkdir -p build/installers

echo ""
echo "步骤 3/3: 创建 DMG 文件..."
create-dmg \
  --volname "Lottery Installer" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "lottery.app" 200 190 \
  --hide-extension "lottery.app" \
  --app-drop-link 600 190 \
  "build/installers/Lottery.dmg" \
  "build/bin/lottery.app"

if [ -f "build/installers/Lottery.dmg" ]; then
    echo ""
    echo "=========================================="
    echo "✅ 打包成功！"
    echo "DMG 文件位置: build/installers/Lottery.dmg"
    ls -lh build/installers/Lottery.dmg
    echo "=========================================="
else
    echo ""
    echo "❌ 打包失败：未找到生成的 DMG 文件"
    exit 1
fi
