# 前端调试指南

## 如何打开浏览器开发者工具

### Mac
- **Chrome/Edge**: `Cmd + Option + I` 或 `Cmd + Option + J` (直接打开Console)
- **Safari**: 需要先在偏好设置中启用"开发"菜单，然后 `Cmd + Option + C`

### Windows/Linux
- **Chrome/Edge**: `F12` 或 `Ctrl + Shift + I` 或 `Ctrl + Shift + J` (直接打开Console)
- **Firefox**: `F12` 或 `Ctrl + Shift + K` (直接打开Console)

## 在Wails应用中打开开发者工具

Wails应用默认不显示开发者工具，但你可以：

1. **开发模式** (`wails dev`): 开发者工具会自动打开
2. **生产模式**: 需要在代码中启用，或者使用快捷键（如果支持）

## 查看控制台日志

1. 打开开发者工具后，点击 **Console** 标签
2. 你会看到所有 `console.log()` 的输出
3. 错误会以红色显示
4. 可以使用过滤器过滤日志类型

## 调试删除功能

当点击删除按钮时，你应该看到以下日志：

```
🔴 删除按钮直接事件监听器触发
用户ID: xxx-xxx-xxx
🚀 deleteUser函数被调用
✅ 用户确认删除，开始执行删除操作
📞 准备调用 window.go.main.App.DeleteUser
```

如果看不到这些日志，说明：
- 事件没有触发 → 检查事件绑定
- 函数没有调用 → 检查函数定义

## 检查Wails绑定

在控制台输入以下命令检查绑定：

```javascript
// 检查基础绑定
console.log('window.go:', typeof window.go);
console.log('window.go.main:', typeof window.go.main);
console.log('window.go.main.App:', typeof window.go.main.App);

// 列出所有可用方法
console.log('可用方法:', Object.keys(window.go.main.App));

// 测试调用（不要真的删除）
window.go.main.App.GetUsers().then(users => {
    console.log('获取用户成功:', users.length);
});
```

## 常见问题

### 1. 看不到任何日志
- 检查控制台是否打开
- 检查是否有过滤器隐藏了日志
- 刷新页面重试

### 2. 看到 "window.go 未定义"
- Wails绑定未初始化
- 尝试刷新页面
- 检查后端是否正常运行

### 3. 看到 "DeleteUser方法不存在"
- 检查后端方法名是否正确
- 运行 `wails generate module` 重新生成绑定
- 检查 `frontend/wailsjs/go/main/App.js` 文件

### 4. 看到错误但不知道原因
- 查看完整的错误堆栈
- 检查错误消息
- 查看后端日志文件：`~/.lottery/lottery.log`

## 查看后端日志

后端日志会同时输出到：
1. **控制台**（运行 `wails dev` 的终端）
2. **日志文件**: `~/.lottery/lottery.log`

查看日志文件：
```bash
tail -f ~/.lottery/lottery.log
```

