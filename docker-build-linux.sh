#!/bin/bash

# Linux 版本编译脚本
# 使用方法: ./docker-build-linux.sh

set -e

echo "🐳 开始使用 Docker 编译 Linux 版本..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker，请先安装 Docker"
    exit 1
fi

# 构建 Docker 镜像（显示进度）
echo "📦 构建 Docker 镜像（这可能需要几分钟，请耐心等待）..."
echo "💡 提示: 首次构建会下载基础镜像和安装依赖，可能需要较长时间"
docker build --progress=plain -f Dockerfile.linux -t lottery-builder:linux .

# 运行编译
echo "🔨 开始编译..."
docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    lottery-builder:linux \
    wails build -platform linux

echo "✅ 编译完成！可执行文件在 build/bin/ 目录下"

