#!/bin/bash

# Linux 版本打包脚本（在 Docker 中编译并创建 DEB 安装包）
# 使用方法: ./docker-package-linux.sh

set -e

echo "=========================================="
echo "🐳 开始使用 Docker 打包 Linux 版本"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker，请先安装 Docker"
    exit 1
fi

# 构建 Docker 镜像（包含打包工具）
echo ""
echo "📦 步骤 1/3: 构建 Docker 镜像..."
echo "💡 提示: 首次构建会下载基础镜像和安装依赖，可能需要较长时间"
docker build --progress=plain -f Dockerfile.linux -t lottery-builder:linux .

# 编译应用
echo ""
echo "🔨 步骤 2/3: 编译 Linux 应用..."
docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    lottery-builder:linux \
    wails build -platform linux

if [ ! -f "build/bin/lottery" ]; then
    echo "❌ 错误: 编译失败，未找到 build/bin/lottery"
    exit 1
fi

# 创建 DEB 包
echo ""
echo "📦 步骤 3/3: 创建 DEB 安装包..."

# 在容器内的临时目录创建包结构（避免 macOS Docker 卷挂载的权限问题）
docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    lottery-builder:linux \
    bash -c "
        # 在容器内的临时目录创建包结构（非挂载目录，权限可控）
        TMP_PKG_DIR=\"/tmp/lottery_pkg\"
        rm -rf \$TMP_PKG_DIR
        
        # 使用 install 命令创建目录结构（自动设置权限为 755）
        install -d -m 755 \$TMP_PKG_DIR/usr/local/bin
        install -d -m 755 \$TMP_PKG_DIR/usr/share/icons
        install -d -m 755 \$TMP_PKG_DIR/usr/share/applications
        install -d -m 755 \$TMP_PKG_DIR/DEBIAN

        # 复制可执行文件并设置权限
        install -m 755 /app/build/bin/lottery \$TMP_PKG_DIR/usr/local/bin/lottery

        # 如果图标存在则复制
        if [ -f \"/app/build/linux/icon.png\" ]; then
            install -m 644 /app/build/linux/icon.png \$TMP_PKG_DIR/usr/share/icons/lottery.png
        fi

        # 创建桌面文件
        cat > \$TMP_PKG_DIR/usr/share/applications/lottery.desktop <<'DESKTOP_EOF'
[Desktop Entry]
Name=Lottery
Exec=/usr/local/bin/lottery
Icon=/usr/share/icons/lottery.png
Terminal=false
Type=Application
Categories=Game;
DESKTOP_EOF
        chmod 644 \$TMP_PKG_DIR/usr/share/applications/lottery.desktop

        # 创建 control 文件
        cat > \$TMP_PKG_DIR/DEBIAN/control <<'CONTROL_EOF'
Package: lottery
Version: 1.0
Section: games
Priority: optional
Architecture: amd64
Maintainer: Your Name <you@example.com>
Description: Lottery Application
CONTROL_EOF
        chmod 644 \$TMP_PKG_DIR/DEBIAN/control
        
        # 确保所有权限正确
        chmod 755 \$TMP_PKG_DIR/DEBIAN
        chmod 755 \$TMP_PKG_DIR/usr/local/bin/lottery
        
        # 验证权限
        echo \"临时目录权限检查:\"
        echo \"  DEBIAN 目录: \$(stat -c '%a' \$TMP_PKG_DIR/DEBIAN)\"
        echo \"  control 文件: \$(stat -c '%a' \$TMP_PKG_DIR/DEBIAN/control)\"
        
        # 确保输出目录存在
        mkdir -p /app/build/installers
        
        # 在临时目录构建 DEB 包
        dpkg-deb --build \$TMP_PKG_DIR /app/build/installers/lottery.deb
        
        echo \"DEB 包已创建: /app/build/installers/lottery.deb\"
    "

if [ -f "build/installers/lottery.deb" ]; then
    echo ""
    echo "=========================================="
    echo "✅ 打包成功！"
    echo "DEB 包位置: build/installers/lottery.deb"
    ls -lh build/installers/lottery.deb
    echo ""
    echo "安装方法:"
    echo "  sudo dpkg -i build/installers/lottery.deb"
    echo "=========================================="
else
    echo ""
    echo "❌ 打包失败：未找到生成的 DEB 包"
    exit 1
fi

