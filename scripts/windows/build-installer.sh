#!/bin/bash

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始 Windows 打包流程"
echo "=========================================="

# 检测操作系统
OS="$(uname -s)"
if [[ "$OS" != "MINGW"* ]] && [[ "$OS" != "MSYS"* ]] && [[ "$OS" != "CYGWIN"* ]]; then
    echo "⚠️  警告: 当前不在 Windows 系统上"
    echo ""
    echo "Inno Setup 只能在 Windows 系统上运行。"
    echo ""
    echo "解决方案："
    echo "1. 在 Windows 系统上运行此脚本（推荐）"
    echo "2. 使用 Windows 虚拟机"
    echo "3. 使用 Wine 运行 Inno Setup（不推荐，可能不稳定）"
    echo ""
    echo "或者，您可以先编译 Windows 应用："
    echo "  wails build -platform windows"
    echo "然后在 Windows 系统上手动使用 Inno Setup 打包"
    echo ""
    read -p "是否继续尝试编译 Windows 应用？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo ""
    echo "⚠️  注意: 将只编译应用，不会创建安装包"
    SKIP_PACKAGE=true
fi

# 检查是否安装 Inno Setup（仅在 Windows 上需要）
if [ "$SKIP_PACKAGE" != "true" ] && ! command -v iscc &> /dev/null; then
    echo "错误: 未找到 Inno Setup Compiler (iscc)"
    echo "请先安装 Inno Setup: https://jrsoftware.org/isdl.php"
    echo "安装后，请确保 iscc 在系统 PATH 中"
    exit 1
fi

echo ""
echo "步骤 1/3: 编译 Windows 应用..."
wails build -platform windows

if [ ! -f "build/bin/lottery.exe" ]; then
    echo "错误: 编译失败，未找到 build/bin/lottery.exe"
    exit 1
fi

echo ""
echo "步骤 2/3: 准备安装包目录..."
mkdir -p build/installers

if [ "$SKIP_PACKAGE" != "true" ]; then
    echo ""
    echo "步骤 3/3: 创建安装程序..."
    # 创建临时的 Inno Setup 脚本
    cat > build/installers/lottery.iss <<EOF
[Setup]
AppName=Lottery
AppVersion=1.0
DefaultDirName={pf}\\Lottery
DefaultGroupName=Lottery
OutputDir=.
OutputBaseFilename=LotterySetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "..\\bin\\lottery.exe"; DestDir: "{app}"
Source: "..\\windows\\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{commondesktop}\\Lottery"; Filename: "{app}\\lottery.exe"
Name: "{commonprograms}\\Lottery"; Filename: "{app}\\lottery.exe"
Name: "{commonstartup}\\Lottery"; Filename: "{app}\\lottery.exe"; Tasks: startup

[Tasks]
Name: startup; Description: "开机自启动"; Flags: unchecked
EOF

    cd build/installers
    iscc lottery.iss
    cd ../..

    if [ -f "build/installers/LotterySetup.exe" ]; then
        echo ""
        echo "=========================================="
        echo "✅ 打包成功！"
        echo "安装程序位置: build/installers/LotterySetup.exe"
        ls -lh build/installers/LotterySetup.exe
        echo "=========================================="
        # 清理临时文件
        rm -f build/installers/lottery.iss
    else
        echo ""
        echo "❌ 打包失败：未找到生成的安装程序"
        exit 1
    fi
else
    echo ""
    echo "=========================================="
    echo "✅ 编译完成！"
    echo "Windows 应用位置: build/bin/lottery.exe"
    echo ""
    echo "⚠️  注意: 由于当前不在 Windows 系统上，无法创建安装包"
    echo "请将编译好的文件复制到 Windows 系统，然后："
    echo "1. 安装 Inno Setup: https://jrsoftware.org/isdl.php"
    echo "2. 在 Windows 上运行此脚本创建安装包"
    echo "   或使用 Inno Setup 手动创建安装程序"
    echo "=========================================="
fi
