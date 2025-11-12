# Windows 桌面程序调试指南

## 问题描述

在 Windows 上编译的桌面程序可能出现数据显示不出来的问题。常见原因包括：

1. **数据为空时的空值错误**：当没有奖项或用户时，前端代码访问 `null.length` 会报错
2. **数据库路径问题**：Windows 路径格式与 macOS/Linux 不同
3. **Wails 绑定问题**：前端无法正确调用后端方法

## 已修复的问题

### 1. 空值检查（已修复）

**问题**：当没有奖项时，`prizes` 可能为 `null`，访问 `prizes.length` 会报错：
```
TypeError: null is not an object (evaluating 'prizes.length')
```

**修复**：在以下函数中添加了空值检查：
- `loadData()` - 确保数据是数组
- `renderUsers()` - 检查 users 是否为数组
- `renderPrizes()` - 检查 prizes 是否为数组
- `updateStats()` - 检查 stats 是否为有效对象

## 调试方法

### 方法一：查看浏览器开发者工具（推荐）

1. **打开开发者工具**：
   - 在 Windows 上，Wails 应用默认使用 WebView2
   - 按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
   - 如果快捷键无效，可以在代码中添加调试菜单

2. **查看控制台日志**：
   - 打开 "Console" 标签页
   - 查看是否有错误信息（红色）
   - 查看日志信息（带图标的消息）

3. **检查网络请求**：
   - 打开 "Network" 标签页
   - 查看是否有失败的请求

### 方法二：查看日志文件

程序会在用户主目录下创建日志文件：

**Windows 路径**：
```
C:\Users\<用户名>\.lottery\lottery.log
```

**查看日志**：
```powershell
# 在 PowerShell 中查看最后 50 行
Get-Content C:\Users\$env:USERNAME\.lottery\lottery.log -Tail 50

# 或者用记事本打开
notepad C:\Users\$env:USERNAME\.lottery\lottery.log
```

日志文件包含：
- `[INFO]` - 信息日志（数据库初始化、操作成功等）
- `[ERROR]` - 错误日志（数据库错误、操作失败等）
- `[SQL]` - SQL 操作日志（查询、插入、更新等）

### 方法三：检查数据库文件

数据库文件位置：
```
C:\Users\<用户名>\.lottery\lottery.db
```

**使用 SQLite 工具查看**：
1. 下载 SQLite 工具（如 DB Browser for SQLite）
2. 打开 `lottery.db` 文件
3. 检查 `users` 和 `prizes` 表是否有数据

**使用命令行查看**（如果安装了 SQLite）：
```powershell
sqlite3 C:\Users\$env:USERNAME\.lottery\lottery.db "SELECT * FROM users;"
sqlite3 C:\Users\$env:USERNAME\.lottery\lottery.db "SELECT * FROM prizes;"
```

### 方法四：添加调试代码

如果需要更详细的调试信息，可以在 `app.js` 中添加：

```javascript
// 在 loadData 函数中添加
console.log('用户数据:', JSON.stringify(users, null, 2));
console.log('奖项数据:', JSON.stringify(prizes, null, 2));
console.log('统计数据:', JSON.stringify(stats, null, 2));
```

## 常见问题排查

### 问题 1：数据显示为空

**症状**：界面显示"暂无用户"或"暂无奖项"，但数据库中可能有数据

**排查步骤**：
1. 检查控制台是否有错误
2. 查看日志文件，确认数据库查询是否成功
3. 检查数据库文件是否存在且有数据
4. 确认 Wails 绑定是否正常（控制台应显示"✅ Wails绑定正常"）

### 问题 2：无法添加用户/奖项

**症状**：点击添加按钮后没有反应，或提示错误

**排查步骤**：
1. 打开开发者工具查看控制台错误
2. 检查日志文件中的 `[ERROR]` 信息
3. 确认数据库文件权限（Windows 可能需要管理员权限）

### 问题 3：抽奖功能不工作

**症状**：点击"开始抽奖"按钮没有反应

**排查步骤**：
1. 确认是否有可用的奖项（奖项数量 > 0）
2. 确认是否有可参与的用户（未中奖用户）
3. 查看控制台是否有 JavaScript 错误
4. 检查日志文件中的抽奖相关日志

### 问题 4：程序启动失败

**症状**：双击 exe 文件后程序无法启动

**排查步骤**：
1. 检查是否有错误提示窗口
2. 查看日志文件（如果已创建）
3. 确认系统是否安装了必要的运行库（WebView2 Runtime）
4. 尝试在命令行中运行，查看错误信息：
   ```powershell
   .\lottery.exe
   ```

## 开发模式调试

如果问题在编译后的程序中出现，可以在开发模式下测试：

```bash
# 在 macOS 上运行开发模式（可以看到详细日志）
wails dev

# 或者直接运行 Go 程序查看标准输出
go run .
```

## 重新编译

修复问题后，需要重新编译：

```bash
# 编译 Windows 版本
wails build -platform windows

# 编译后的文件在
# build/bin/lottery.exe
```

## 联系支持

如果问题仍然存在，请提供以下信息：

1. **错误截图**：开发者工具控制台的错误信息
2. **日志文件**：`C:\Users\<用户名>\.lottery\lottery.log` 的最后 100 行
3. **系统信息**：Windows 版本、Go 版本、Wails 版本
4. **操作步骤**：重现问题的详细步骤

## 预防措施

为了避免类似问题，建议：

1. **先添加奖项，再添加用户**：虽然现在已修复，但建议按逻辑顺序操作
2. **定期备份数据库**：复制 `lottery.db` 文件到安全位置
3. **查看日志**：定期查看日志文件，及时发现潜在问题
