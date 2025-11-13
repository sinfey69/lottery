#!/bin/bash

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始 Linux 打包流程"
echo "=========================================="

# 检测操作系统
OS="$(uname -s)"
if [[ "$OS" != "Linux" ]]; then
    echo "⚠️  警告: 当前不在 Linux 系统上"
    echo ""
    echo "dpkg-deb 只能在 Linux 系统上运行。"
    echo ""
    echo "解决方案："
    echo "1. 在 Linux 系统上运行此脚本（推荐）"
    echo "2. 使用 Linux 虚拟机或 Docker 容器"
    echo "3. 使用项目提供的 Docker 打包脚本: ./docker-package-linux.sh（推荐）"
    echo ""
    echo "或者，您可以先编译 Linux 应用："
    echo "  wails build -platform linux"
    echo "然后在 Linux 系统上手动打包"
    echo ""
    read -p "是否继续尝试编译 Linux 应用？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo ""
    echo "⚠️  注意: 将只编译应用，不会创建安装包"
    SKIP_PACKAGE=true
fi

# 检查是否安装 dpkg-deb（仅在 Linux 上需要）
if [ "$SKIP_PACKAGE" != "true" ] && ! command -v dpkg-deb &> /dev/null; then
    echo "错误: 未找到 dpkg-deb"
    echo "请安装: sudo apt-get install dpkg-dev"
    exit 1
fi

echo ""
echo "步骤 1/4: 编译 Linux 应用..."
wails build -platform linux

if [ ! -f "build/bin/lottery" ]; then
    echo "错误: 编译失败，未找到 build/bin/lottery"
    exit 1
fi

if [ "$SKIP_PACKAGE" != "true" ]; then
    echo ""
    echo "步骤 2/4: 准备安装包目录..."
    mkdir -p build/installers
    PKG_DIR="build/installers/lottery_pkg"
    rm -rf $PKG_DIR
    mkdir -p $PKG_DIR/usr/local/bin
    mkdir -p $PKG_DIR/usr/share/icons
    mkdir -p $PKG_DIR/usr/share/applications
    mkdir -p $PKG_DIR/DEBIAN

    echo ""
    echo "步骤 3/4: 复制文件..."
    cp build/bin/lottery $PKG_DIR/usr/local/bin/
    chmod +x $PKG_DIR/usr/local/bin/lottery

    # 如果图标存在则复制，否则跳过
    if [ -f "build/linux/icon.png" ]; then
        cp build/linux/icon.png $PKG_DIR/usr/share/icons/lottery.png
    fi

    # 创建桌面文件
    cat > $PKG_DIR/usr/share/applications/lottery.desktop <<EOF
[Desktop Entry]
Name=Lottery
Exec=/usr/local/bin/lottery
Icon=/usr/share/icons/lottery.png
Terminal=false
Type=Application
Categories=Game;
EOF

    # 创建 control 文件
    cat > $PKG_DIR/DEBIAN/control <<EOF
Package: lottery
Version: 1.0
Section: games
Priority: optional
Architecture: amd64
Maintainer: Your Name <you@example.com>
Description: Lottery Application
EOF

    # 设置 DEBIAN 目录权限（dpkg-deb 要求权限在 0755-0775 之间）
    chmod 755 $PKG_DIR/DEBIAN
    chmod 644 $PKG_DIR/DEBIAN/control

    echo ""
    echo "步骤 4/4: 构建 DEB 包..."
    dpkg-deb --build $PKG_DIR build/installers/lottery.deb

    if [ -f "build/installers/lottery.deb" ]; then
        echo ""
        echo "=========================================="
        echo "✅ 打包成功！"
        echo "DEB 包位置: build/installers/lottery.deb"
        ls -lh build/installers/lottery.deb
        echo "=========================================="
    else
        echo ""
        echo "❌ 打包失败：未找到生成的 DEB 包"
        exit 1
    fi
else
    echo ""
    echo "=========================================="
    echo "✅ 编译完成！"
    echo "Linux 应用位置: build/bin/lottery"
    echo ""
    echo "⚠️  注意: 由于当前不在 Linux 系统上，无法创建安装包"
    echo "请使用 Docker 打包脚本（推荐）："
    echo "  ./docker-package-linux.sh"
    echo ""
    echo "或者，将编译好的文件复制到 Linux 系统，然后："
    echo "1. 安装 dpkg-dev: sudo apt-get install dpkg-dev"
    echo "2. 在 Linux 上运行此脚本创建安装包"
    echo "=========================================="
fi
