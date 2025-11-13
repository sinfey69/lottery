# 抽奖程序

一个基于 Go + Wails 开发的跨平台桌面抽奖应用程序，支持 Mac、Windows 和 Linux（包括国产系统）。

## 功能特点

- ✅ **多类型奖项管理**：支持设置多个奖项，每个奖项可设置中奖数量
- ✅ **用户管理**：支持添加用户姓名和照片（照片可选）
- ✅ **批量导入用户**：支持 CSV 文件导入和文件夹批量导入
- ✅ **公平抽奖**：使用随机算法确保抽奖公平公正
- ✅ **防重复抽奖**：已中奖用户自动排除，不会重复中奖
- ✅ **数据持久化**：使用 SQLite 数据库存储，程序重启后数据不丢失
- ✅ **抽奖动画**：抽奖时屏幕快速交替显示用户信息，支持自定义时长
- ✅ **全屏模式**：支持全屏抽奖，适合大屏幕展示
- ✅ **自定义背景**：支持设置自定义背景图（包括动态 GIF）
- ✅ **中奖列表**：可查看所有中奖用户及对应奖项
- ✅ **Tab 界面**：用户与奖项管理、抽奖页面分离，界面更清晰
- ✅ **跨平台支持**：可编译为 Mac、Windows、Linux 桌面应用

## 技术栈

- **后端**：Go 1.23+
- **前端**：HTML + CSS + JavaScript
- **框架**：Wails v2.11.0
- **数据存储**：SQLite 数据库（存储在用户主目录的 `.lottery` 目录）

## 安装和运行

### 前置要求

1. Go 1.23 或更高版本
2. Wails CLI 工具

### 安装 Wails

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 安装依赖

```bash
go mod download
```

### 开发模式运行

```bash
wails dev
```

### 编译为桌面应用

#### Mac
```bash
wails build -platform darwin
```

#### Windows
```bash
wails build -platform windows
```

#### Linux（包括国产系统）

**重要提示**：Wails 目前不支持从 macOS 交叉编译到 Linux。如需编译 Linux 版本，请使用以下方法：

**方法一：在 Linux 系统上直接编译（推荐）**
```bash
# 在 Linux 系统上执行
wails build -platform linux
```

**方法二：使用 Docker 容器编译**

我们提供了两种方式：

**方式 A：使用提供的脚本（推荐）**
```bash
# 运行编译脚本
./docker-build-linux.sh
```

**方式 B：手动执行 Docker 命令（快速测试）**
```bash
# 如果遇到网络问题，可以设置 Go 代理和 apt 镜像
docker run --rm \
  -v "$(pwd)":/app \
  -w /app \
  -e GOPROXY=https://goproxy.cn,direct \
  golang:1.23 sh -c "
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      gcc pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev ca-certificates && \
    go install github.com/wailsapp/wails/v2/cmd/wails@latest && \
    export PATH=\$PATH:/go/bin && \
    wails build -platform linux
  "
```

**⚠️ 注意**：首次构建需要下载系统依赖，可能需要 5-10 分钟，请耐心等待。

**方式 C：使用 Dockerfile（最稳定）**
```bash
# 构建镜像
docker build -f Dockerfile.linux -t lottery-builder:linux .

# 运行编译
docker run --rm -v "$(pwd)":/app -w /app lottery-builder:linux
```

**方法三：使用 GitHub Actions 或其他 CI/CD 服务**
在 Linux 环境的 CI/CD 中自动编译。

编译后的可执行文件会在 `build/bin` 目录下。

## 打包安装程序

为了方便普通用户安装使用，可以将编译后的应用打包成各平台的安装包。

### macOS

1. **安装依赖**（如果未安装）：
   ```bash
   brew install create-dmg
   ```

2. **运行打包脚本**：
   ```bash
   chmod +x scripts/macos/build-dmg.sh
   ./scripts/macos/build-dmg.sh
   ```

3. **生成的 DMG 文件**：
   - 位置：`build/installers/Lottery.dmg`
   - 用户可以直接双击 DMG 文件，将应用拖拽到 Applications 文件夹完成安装

### Windows

**⚠️ 重要提示**：Windows 打包脚本必须在 Windows 系统上运行，因为 Inno Setup 只能在 Windows 上运行。

1. **安装依赖**：
   - 下载并安装 [Inno Setup](https://jrsoftware.org/isdl.php)
   - 确保 `iscc` 命令在系统 PATH 中

2. **运行打包脚本**：
   ```bash
   chmod +x scripts/windows/build-installer.sh
   ./scripts/windows/build-installer.sh
   ```

3. **生成的安装程序**：
   - 位置：`build/installers/LotterySetup.exe`
   - 用户可以直接运行安装程序进行安装

**在非 Windows 系统上**：
- 如果您在 macOS 或 Linux 上，脚本会提示您并询问是否只编译应用（不创建安装包）
- 编译完成后，您可以将 `build/bin/lottery.exe` 复制到 Windows 系统上，然后：
  - 在 Windows 上运行打包脚本，或
  - 使用 Inno Setup 手动创建安装程序

### Linux

#### 方法一：使用 Docker 打包（推荐，支持所有平台）

**适用于 macOS、Windows 和 Linux 系统**

1. **确保已安装 Docker**：
   ```bash
   docker --version
   ```

2. **运行 Docker 打包脚本**：
   ```bash
   chmod +x docker-package-linux.sh
   ./docker-package-linux.sh
   ```

3. **生成的 DEB 包**：
   - 位置：`build/installers/lottery.deb`
   - 用户可以使用以下命令安装：
     ```bash
     sudo dpkg -i build/installers/lottery.deb
     ```

**优点**：
- ✅ 可在任何支持 Docker 的系统上运行（macOS、Windows、Linux）
- ✅ 自动处理所有依赖
- ✅ 环境隔离，不影响本地系统
- ✅ 解决了 macOS 上 Docker 卷挂载的权限问题（在容器内临时目录构建）

**技术说明**：Docker 打包脚本在容器内的临时目录（`/tmp`）创建包结构并构建 DEB 包，避免了 macOS 上 Docker 卷挂载时的文件权限限制问题，确保打包过程稳定可靠。

#### 方法二：在 Linux 系统上直接打包

**⚠️ 重要提示**：此方法必须在 Linux 系统上运行，因为 `dpkg-deb` 只能在 Linux 上运行。

1. **安装依赖**（如果未安装）：
   ```bash
   sudo apt-get install dpkg-dev
   ```

2. **运行打包脚本**：
   ```bash
   chmod +x scripts/linux/build-deb.sh
   ./scripts/linux/build-deb.sh
   ```

3. **生成的 DEB 包**：
   - 位置：`build/installers/lottery.deb`
   - 用户可以使用以下命令安装：
     ```bash
     sudo dpkg -i build/installers/lottery.deb
     ```

**在非 Linux 系统上**：
- 如果您在 macOS 或 Windows 上，脚本会提示您并询问是否只编译应用（不创建安装包）
- 编译完成后，您可以将 `build/bin/lottery` 复制到 Linux 系统上，然后：
  - 在 Linux 上运行打包脚本，或
  - 使用 Docker 打包脚本：`./docker-package-linux.sh`（推荐）

**注意**：所有打包脚本会自动执行编译步骤，无需提前手动编译。

## 使用说明

### 1. 添加用户

#### 单个添加
1. 切换到"用户与奖项管理"标签页
2. 在"用户管理"面板点击"添加用户"按钮
3. 输入用户姓名（如果留空，将使用照片文件名作为姓名）
4. 选择用户照片（可选，如果不提供照片，抽奖时只显示姓名）
5. 点击"添加"完成

#### CSV 导入
1. 点击"导入"按钮
2. 选择 CSV 文件（格式：姓名,照片路径 或 姓名）
3. 如果用户已存在（按姓名匹配），将更新该用户信息；否则创建新用户

#### 文件夹批量导入
1. 点击"文件夹导入"按钮
2. 选择包含图片文件的文件夹
3. 程序会自动使用文件名（不含扩展名）作为用户姓名，图片作为照片
4. 批量添加所有用户

### 2. 设置奖项

1. 在"用户与奖项管理"标签页的"奖项管理"面板点击"添加奖项"按钮
2. 填写奖项信息：
   - 奖项名称：如"一等奖"、"二等奖"等
   - 奖项描述：可选
   - 中奖数量：该奖项要抽取的人数
   - 奖项等级：数字越小等级越高（用于排序）
3. 点击"添加"完成

### 3. 开始抽奖

1. 切换到"抽奖"标签页
2. 选择要抽取的奖项
3. （可选）设置抽奖时长（秒），默认 4 秒
4. （可选）点击"设置背景"按钮设置自定义背景图
5. 点击"开始抽奖"按钮
6. 屏幕会快速交替显示用户信息（动画效果，开始慢、中间快、最后慢）
7. 显示中奖结果，包括中奖用户和对应奖项
8. 中奖用户会自动标记，不会再次参与抽奖

### 4. 全屏模式

1. 在抽奖页面点击"全屏"按钮
2. 进入全屏模式，适合大屏幕展示
3. 在全屏模式下可以：
   - 选择奖项
   - 调整抽奖时长
   - 开始抽奖
   - 查看中奖列表
   - 设置背景图
4. 点击"退出全屏"返回普通模式

### 5. 查看中奖列表

1. 点击"中奖列表"按钮
2. 查看所有中奖用户，包括：
   - 用户姓名和照片
   - 中奖奖项
   - 中奖时间

### 6. 重置抽奖

如果需要重新开始，可以点击"重置抽奖"按钮，这将清空所有中奖记录，所有用户可以重新参与抽奖。

## 数据存储

程序数据存储在用户主目录下的 `.lottery` 目录中：
- **Mac/Linux**: `~/.lottery/lottery.db`
- **Windows**: `C:\Users\<用户名>\.lottery\lottery.db`

数据以 SQLite 数据库格式存储，包含：
- 所有用户信息（包括中奖状态、中奖时间、中奖奖项）
- 所有奖项信息（包括已抽取数量）

程序重启后会自动加载这些数据，确保已中奖用户不会重新参与抽奖。

## 项目结构

```
lottery/
├── main.go          # 程序入口
├── app.go           # 应用逻辑（用户管理、奖项管理、抽奖逻辑）
├── models.go        # 数据模型
├── database.go      # 数据库初始化和操作
├── go.mod           # Go 模块文件
├── wails.json       # Wails 配置文件
├── frontend/        # 前端文件
│   ├── index.html   # 主页面
│   ├── style.css    # 样式文件
│   └── app.js       # 前端逻辑
├── README.md        # 说明文档
└── QUICKSTART.md    # 快速开始指南
```

## 开发说明

### 后端 API

所有后端方法都通过 Wails 自动暴露给前端，主要方法包括：

- `GetUsers()` - 获取所有用户
- `AddUser(name, photo)` - 添加用户
- `DeleteUser(userID)` - 删除用户
- `DeleteAllUsers()` - 删除所有用户
- `GetPrizes()` - 获取所有奖项
- `AddPrize(name, description, count, level)` - 添加奖项
- `DeletePrize(prizeID)` - 删除奖项
- `UpdatePrize(prizeID, name, description, count, level)` - 更新奖项
- `DrawLottery(prizeID)` - 执行抽奖
- `ResetLottery()` - 重置抽奖
- `GetStatistics()` - 获取统计信息
- `GetAvailableUsers()` - 获取可参与抽奖的用户
- `GetWonUsers()` - 获取所有中奖用户
- `ImportUsersFromCSV(csvData)` - 从 CSV 导入用户

### 抽奖算法

抽奖使用 Go 的 `math/rand` 包进行随机选择，确保公平性：
1. 从所有未中奖的用户中随机选择
2. 每个用户被选中的概率相等
3. 已中奖用户自动排除

### 抽奖动画

- 使用 `requestAnimationFrame` 实现流畅动画
- 采用缓动函数（ease-in-out），开始慢、中间快、最后慢
- 支持自定义抽奖时长（2-30 秒）
- 如果用户没有照片，显示大号姓名

## 注意事项

1. 照片建议使用较小的文件（建议小于 1MB），以 base64 格式存储在数据库中
2. 如果用户数量很多，建议使用 CSV 或文件夹批量导入
3. 重置抽奖会清空所有中奖记录，请谨慎操作
4. 数据库文件是 SQLite 格式，可以使用 SQLite 工具查看和编辑（但请谨慎操作）
5. 自定义背景图支持静态图片和动态 GIF，会自动适应大小
6. 抽奖时长设置会保存到本地，下次打开程序时自动恢复

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

