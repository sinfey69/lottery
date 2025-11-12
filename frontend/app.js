// 全局变量
let currentPhotoBase64 = '';
let drawAnimationInterval = null;
let isDrawing = false;
let isFullscreen = false;
let drawDuration = 4; // 默认抽奖时长（秒）
let currentAnimation = null; // 当前运行的动画函数引用
let currentAnimationContext = null; // 当前动画的上下文（包含startTime等）

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');

    // 检查Wails绑定
    if (typeof window.go === 'undefined') {
        console.error('❌ window.go 未定义！Wails绑定可能有问题');
        alert('警告：Wails绑定未初始化，请刷新页面重试');
    } else if (typeof window.go.main === 'undefined') {
        console.error('❌ window.go.main 未定义！');
        alert('警告：Wails main模块未初始化');
    } else if (typeof window.go.main.App === 'undefined') {
        console.error('❌ window.go.main.App 未定义！');
        alert('警告：App对象未绑定');
    } else {
        console.log('✅ Wails绑定正常');
        console.log('可用的App方法:', Object.keys(window.go.main.App));
    }

    // 加载保存的抽奖时长设置
    const savedDuration = localStorage.getItem('drawDuration');
    if (savedDuration) {
        const durationInput = document.getElementById('drawDuration');
        const fullscreenDurationInput = document.getElementById('fullscreenDrawDuration');
        if (durationInput) durationInput.value = savedDuration;
        if (fullscreenDurationInput) fullscreenDurationInput.value = savedDuration;
        drawDuration = parseInt(savedDuration) || 4;
    }

    loadData();

    // 初始化tab切换
    switchTab('management');

    // 加载保存的背景图
    const savedBackground = localStorage.getItem('lotteryBackground');
    if (savedBackground) {
        applyBackground(savedBackground);
    }

    // 为数字输入框绑定键盘事件（直接在输入框上绑定，确保全屏模式下也能工作）
    window.setupNumberInputKeydown = function (input) {
        if (!input) return;

        // 移除可能存在的旧监听器（通过克隆节点）
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // 绑定键盘事件
        newInput.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                const currentValue = parseInt(newInput.value) || parseInt(newInput.min) || 0;
                const step = parseInt(newInput.step) || 1;
                const min = parseInt(newInput.min) || 0;
                const max = parseInt(newInput.max) || Infinity;

                let newValue = currentValue;
                if (event.key === 'ArrowUp') {
                    newValue = Math.min(currentValue + step, max);
                } else {
                    newValue = Math.max(currentValue - step, min);
                }

                newInput.value = newValue;
                // 触发change事件
                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                newInput.dispatchEvent(changeEvent);

                return false;
            }
        }, true); // 使用捕获阶段

        // 保留原有的onchange处理
        if (newInput.getAttribute('onchange')) {
            const onchangeAttr = newInput.getAttribute('onchange');
            newInput.addEventListener('change', function () {
                if (onchangeAttr.includes('saveDrawDuration')) {
                    saveDrawDuration();
                }
            });
        }
    };

    // 立即设置输入框事件
    function initNumberInputs() {
        const durationInput = document.getElementById('drawDuration');
        const fullscreenDurationInput = document.getElementById('fullscreenDrawDuration');
        if (window.setupNumberInputKeydown) {
            window.setupNumberInputKeydown(durationInput);
            window.setupNumberInputKeydown(fullscreenDurationInput);
        }
    }

    // 初始化
    initNumberInputs();

    // 监听全屏切换，重新绑定事件
    const originalToggleFullscreen = window.toggleFullscreen;
    if (typeof originalToggleFullscreen === 'function') {
        window.toggleFullscreen = function () {
            originalToggleFullscreen.apply(this, arguments);
            // 延迟一点，确保DOM更新完成
            setTimeout(initNumberInputs, 100);
        };
    }

    // 使用事件委托处理删除按钮点击（作为备用，但优先级较低）
    const userList = document.getElementById('userList');
    if (userList) {
        console.log('✅ 用户列表元素找到，绑定事件委托（备用）');
        userList.addEventListener('click', function (e) {
            // 如果事件已经被处理，就不继续
            if (e.defaultPrevented || e.cancelBubble) {
                console.log('事件已被处理，跳过委托');
                return;
            }

            console.log('用户列表点击事件触发（委托），目标:', e.target);
            if (e.target && e.target.classList.contains('btn-danger')) {
                console.log('✅ 检测到删除按钮点击（通过委托）');
                const userItem = e.target.closest('.user-item');
                if (userItem) {
                    const userId = userItem.getAttribute('data-user-id') || e.target.getAttribute('data-user-id');
                    console.log('从data-user-id获取用户ID:', userId);
                    if (userId) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof window.deleteUser === 'function') {
                            window.deleteUser(userId);
                        }
                    } else {
                        console.error('❌ 无法获取用户ID');
                    }
                } else {
                    console.error('❌ 无法找到user-item父元素');
                }
            }
        }, false); // 使用冒泡阶段，优先级低于直接绑定
    } else {
        console.error('❌ 无法找到userList元素');
    }
});

// Tab切换
function switchTab(tabName) {
    console.log('切换到tab:', tabName);

    // 隐藏所有tab内容
    const managementTab = document.getElementById('managementTab');
    const lotteryTab = document.getElementById('lotteryTab');
    const tabManagement = document.getElementById('tabManagement');
    const tabLottery = document.getElementById('tabLottery');

    if (managementTab) managementTab.classList.remove('active');
    if (lotteryTab) lotteryTab.classList.remove('active');
    if (tabManagement) tabManagement.classList.remove('active');
    if (tabLottery) tabLottery.classList.remove('active');

    // 显示选中的tab
    if (tabName === 'management') {
        if (managementTab) managementTab.classList.add('active');
        if (tabManagement) tabManagement.classList.add('active');
    } else if (tabName === 'lottery') {
        if (lotteryTab) lotteryTab.classList.add('active');
        if (tabLottery) tabLottery.classList.add('active');
    }
}

// 保存抽奖时长设置
function saveDrawDuration() {
    const durationInput = document.getElementById('drawDuration');
    const fullscreenDurationInput = document.getElementById('fullscreenDrawDuration');

    let duration = 4;
    if (durationInput && durationInput.value) {
        duration = parseInt(durationInput.value) || 4;
    } else if (fullscreenDurationInput && fullscreenDurationInput.value) {
        duration = parseInt(fullscreenDurationInput.value) || 4;
    }

    // 同步两个输入框的值
    if (durationInput) durationInput.value = duration;
    if (fullscreenDurationInput) fullscreenDurationInput.value = duration;

    // 保存到localStorage
    localStorage.setItem('drawDuration', duration.toString());
    drawDuration = duration;
    console.log('抽奖时长已保存:', duration, '秒');
}

// 显示背景设置对话框
function showBackgroundModal() {
    const modal = document.getElementById('backgroundModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 预览背景图
function previewBackground(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('backgroundPreview');
    if (!preview) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 300px; border-radius: 5px;" alt="背景预览">`;
    };
    reader.readAsDataURL(file);
}

// 设置背景图
function setBackground(event) {
    event.preventDefault();

    const fileInput = document.getElementById('backgroundInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('请选择背景图');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const backgroundData = e.target.result;

        // 保存到localStorage
        localStorage.setItem('lotteryBackground', backgroundData);

        // 应用背景
        applyBackground(backgroundData);

        closeModal('backgroundModal');
        alert('背景图设置成功！');
    };
    reader.readAsDataURL(file);
}

// 应用背景图
function applyBackground(backgroundData) {
    const lotteryBackground = document.getElementById('lotteryBackground');
    const fullscreenBackground = document.getElementById('fullscreenBackground');

    if (lotteryBackground) {
        if (backgroundData) {
            lotteryBackground.style.backgroundImage = `url(${backgroundData})`;
            lotteryBackground.style.backgroundSize = 'cover';
            lotteryBackground.style.backgroundPosition = 'center';
            lotteryBackground.style.backgroundRepeat = 'no-repeat';
            lotteryBackground.style.display = 'block';
        } else {
            lotteryBackground.style.backgroundImage = '';
            lotteryBackground.style.display = 'none';
        }
    }

    if (fullscreenBackground) {
        if (backgroundData) {
            fullscreenBackground.style.backgroundImage = `url(${backgroundData})`;
            fullscreenBackground.style.backgroundSize = 'cover';
            fullscreenBackground.style.backgroundPosition = 'center';
            fullscreenBackground.style.backgroundRepeat = 'no-repeat';
            fullscreenBackground.style.display = 'block';
        } else {
            fullscreenBackground.style.backgroundImage = '';
            fullscreenBackground.style.display = 'none';
        }
    }

    console.log('背景图已应用:', backgroundData ? '有背景' : '无背景');
}

// 处理数字输入框的键盘事件（支持上下键调整）
function handleNumberInputKeydown(event) {
    const input = event.target;
    if (!input || input.type !== 'number') return;

    // 允许上下键调整数值
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const currentValue = parseInt(input.value) || parseInt(input.min) || 0;
        const step = parseInt(input.step) || 1;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || Infinity;

        let newValue = currentValue;
        if (event.key === 'ArrowUp') {
            newValue = Math.min(currentValue + step, max);
        } else {
            newValue = Math.max(currentValue - step, min);
        }

        input.value = newValue;
        // 触发change事件
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        input.dispatchEvent(changeEvent);

        return false;
    }
}

// 恢复默认背景
function resetBackground() {
    localStorage.removeItem('lotteryBackground');
    applyBackground(null);
    closeModal('backgroundModal');
    alert('已恢复默认背景');
}

// 显示确认对话框（自定义模态框）
function showConfirmDialog(title, message, okText = '确认', cancelText = '取消') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmDeleteModal');
        const titleEl = document.getElementById('confirmDeleteTitle');
        const messageEl = document.getElementById('confirmDeleteMessage');
        const okBtn = document.getElementById('confirmDeleteOk');
        const cancelBtn = document.getElementById('confirmDeleteCancel');

        if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
            console.error('确认对话框元素未找到，使用浏览器confirm');
            const result = window.confirm(message);
            resolve(result);
            return;
        }

        console.log('显示自定义确认对话框');
        console.log('标题:', title);
        console.log('消息:', message);

        // 设置内容
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;

        // 显示模态框
        modal.style.display = 'flex';
        console.log('模态框已显示');

        // 清理之前的事件监听器（通过克隆节点）
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // 绑定新的事件
        const handleOk = () => {
            console.log('用户点击了确认按钮');
            modal.style.display = 'none';
            resolve(true);
        };

        const handleCancel = () => {
            console.log('用户点击了取消按钮');
            modal.style.display = 'none';
            resolve(false);
        };

        newOkBtn.addEventListener('click', handleOk);
        newCancelBtn.addEventListener('click', handleCancel);

        // 点击背景关闭
        const handleBackgroundClick = (e) => {
            if (e.target === modal) {
                console.log('用户点击了背景');
                modal.removeEventListener('click', handleBackgroundClick);
                handleCancel();
            }
        };
        modal.addEventListener('click', handleBackgroundClick);

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                console.log('用户按了ESC键');
                document.removeEventListener('keydown', handleEsc);
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// 加载数据
async function loadData() {
    try {
        console.log('🔄 loadData: 开始加载数据...');
        const users = await window.go.main.App.GetUsers();
        const prizes = await window.go.main.App.GetPrizes();
        const stats = await window.go.main.App.GetStatistics();

        // 确保数据是数组，防止 null 或 undefined
        const safeUsers = Array.isArray(users) ? users : [];
        const safePrizes = Array.isArray(prizes) ? prizes : [];
        const safeStats = stats || {};

        console.log('🔄 loadData: 获取到数据 - 用户数:', safeUsers.length, '奖项数:', safePrizes.length);
        
        renderUsers(safeUsers);
        renderPrizes(safePrizes);
        updateStats(safeStats);
        
        console.log('✅ loadData: 数据加载和渲染完成');
    } catch (error) {
        console.error('❌ 加载数据失败:', error);
        console.error('错误详情:', error.message, error.stack);
        // 即使出错也尝试渲染空数据，避免界面卡死
        renderUsers([]);
        renderPrizes([]);
        updateStats({ totalUsers: 0, wonUsers: 0, availableUsers: 0 });
    }
}

// 渲染用户列表
function renderUsers(users) {
    const userList = document.getElementById('userList');
    const userCount = document.getElementById('userCount');

    if (!userList) {
        console.error('❌ 无法找到userList元素');
        return;
    }

    // 确保 users 是数组
    if (!Array.isArray(users)) {
        console.warn('⚠️ renderUsers: users 不是数组，使用空数组');
        users = [];
    }

    // 更新总人数显示
    if (userCount) {
        userCount.textContent = `(${users.length}人)`;
    }

    // 清空列表
    userList.innerHTML = '';

    if (users.length === 0) {
        userList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无用户，请添加用户</p>';
        console.log('✅ 用户列表已清空，显示"暂无用户"');
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user.won ? 'won' : ''}`;
        userItem.setAttribute('data-user-id', user.id);

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';

        if (user.photo) {
            const img = document.createElement('img');
            img.src = user.photo;
            img.alt = user.name;
            img.className = 'user-photo';
            userInfo.appendChild(img);
        }

        const userName = document.createElement('span');
        userName.className = 'user-name';
        userName.textContent = user.name;
        userInfo.appendChild(userName);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '删除';
        deleteBtn.type = 'button'; // 防止表单提交
        deleteBtn.setAttribute('data-test-id', 'delete-user-btn');
        deleteBtn.setAttribute('data-user-id', user.id); // 添加data属性作为备用
        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation(); // 阻止其他监听器
            console.log('🔴 删除按钮直接事件监听器触发');
            console.log('用户ID:', user.id);
            console.log('用户ID类型:', typeof user.id);
            console.log('事件对象:', e);
            console.log('是否已阻止默认行为:', e.defaultPrevented);
            console.log('是否已停止传播:', e.cancelBubble);

            // 检查deleteUser函数是否存在
            if (typeof window.deleteUser === 'function') {
                console.log('✅ deleteUser函数存在，准备调用');
                // 使用window.deleteUser确保调用全局函数
                window.deleteUser(user.id);
            } else if (typeof deleteUser === 'function') {
                console.log('✅ deleteUser函数存在（局部），准备调用');
                deleteUser(user.id);
            } else {
                console.error('❌ deleteUser函数不存在！');
                console.error('window.deleteUser:', typeof window.deleteUser);
                console.error('局部deleteUser:', typeof deleteUser);
                alert('错误：deleteUser函数未定义');
            }
        }, true); // 使用捕获阶段，优先执行

        userItem.appendChild(userInfo);
        userItem.appendChild(deleteBtn);
        userList.appendChild(userItem);
    });
}

// 渲染奖项列表
function renderPrizes(prizes) {
    const prizeList = document.getElementById('prizeList');
    const prizeSelect = document.getElementById('prizeSelect');
    const fullscreenPrizeSelect = document.getElementById('fullscreenPrizeSelect');

    // 确保 prizes 是数组
    if (!Array.isArray(prizes)) {
        console.warn('⚠️ renderPrizes: prizes 不是数组，使用空数组');
        prizes = [];
    }

    prizeList.innerHTML = '';
    prizeSelect.innerHTML = '<option value="">请选择奖项</option>';
    if (fullscreenPrizeSelect) {
        fullscreenPrizeSelect.innerHTML = '<option value="">请选择奖项</option>';
    }

    if (prizes.length === 0) {
        prizeList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无奖项</p>';
        return;
    }

    // 按等级排序
    const sortedPrizes = [...prizes].sort((a, b) => a.level - b.level);

    sortedPrizes.forEach(prize => {
        // 添加到列表
        const prizeItem = document.createElement('div');
        prizeItem.className = 'prize-item';
        prizeItem.setAttribute('data-prize-id', prize.id);

        const prizeInfo = document.createElement('div');
        prizeInfo.className = 'prize-info';

        const prizeName = document.createElement('div');
        prizeName.className = 'prize-name';
        prizeName.textContent = prize.name;
        prizeInfo.appendChild(prizeName);

        if (prize.description) {
            const prizeDesc = document.createElement('div');
            prizeDesc.className = 'prize-desc';
            prizeDesc.textContent = prize.description;
            prizeInfo.appendChild(prizeDesc);
        }

        const prizeCount = document.createElement('div');
        prizeCount.className = 'prize-count';
        prizeCount.textContent = `${prize.drawnCount} / ${prize.count}`;

        const progress = document.createElement('div');
        progress.className = 'progress';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.style.width = `${(prize.drawnCount / prize.count) * 100}%`;
        progress.appendChild(progressBar);
        prizeCount.appendChild(progress);
        prizeInfo.appendChild(prizeCount);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = '删除';
        deleteBtn.type = 'button';
        deleteBtn.setAttribute('data-test-id', 'delete-prize-btn');
        deleteBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔴 删除奖项按钮直接事件监听器触发');
            console.log('奖项ID:', prize.id);

            if (typeof deletePrize === 'function') {
                console.log('✅ deletePrize函数存在，准备调用');
                deletePrize(prize.id);
            } else {
                console.error('❌ deletePrize函数不存在！');
                alert('错误：deletePrize函数未定义');
            }
        });

        prizeItem.appendChild(prizeInfo);
        prizeItem.appendChild(deleteBtn);
        prizeList.appendChild(prizeItem);

        // 添加到下拉框（只显示未抽完的）
        if (prize.drawnCount < prize.count) {
            const option = document.createElement('option');
            option.value = prize.id;
            option.textContent = `${prize.name} (剩余 ${prize.count - prize.drawnCount})`;
            prizeSelect.appendChild(option);

            // 同时添加到全屏下拉框
            if (fullscreenPrizeSelect) {
                const fullscreenOption = option.cloneNode(true);
                fullscreenPrizeSelect.appendChild(fullscreenOption);
            }
        }
    });
}

// 更新统计信息
function updateStats(stats) {
    // 确保 stats 是对象，防止 null 或 undefined
    if (!stats || typeof stats !== 'object') {
        console.warn('⚠️ updateStats: stats 不是有效对象，使用默认值');
        stats = { totalUsers: 0, wonUsers: 0, availableUsers: 0 };
    }

    const totalUsersEl = document.getElementById('totalUsers');
    const wonUsersEl = document.getElementById('wonUsers');
    const availableUsersEl = document.getElementById('availableUsers');

    if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
    if (wonUsersEl) wonUsersEl.textContent = stats.wonUsers || 0;
    if (availableUsersEl) availableUsersEl.textContent = stats.availableUsers || 0;
}

// 显示添加用户模态框
function showAddUserModal() {
    document.getElementById('addUserModal').style.display = 'block';
    document.getElementById('addUserForm').reset();
    currentPhotoBase64 = '';
    document.getElementById('photoPreview').innerHTML = '';
}

// 显示添加奖项模态框
function showAddPrizeModal() {
    document.getElementById('addPrizeModal').style.display = 'block';
    document.getElementById('addPrizeForm').reset();
}

// 关闭模态框
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 处理照片上传
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        currentPhotoBase64 = e.target.result;
        document.getElementById('photoPreview').innerHTML = `<img src="${currentPhotoBase64}" alt="预览">`;
    };
    reader.readAsDataURL(file);
}

// 删除所有用户
async function deleteAllUsers() {
    console.log('🚀 deleteAllUsers函数被调用');

    // 使用自定义确认对话框
    const confirmed = await showConfirmDialog(
        '确认删除所有用户',
        '确定要删除所有用户吗？\n\n此操作将永久删除所有用户数据，包括中奖记录！\n\n此操作不可撤销！',
        '确认删除',
        '取消'
    );

    if (!confirmed) {
        console.log('用户取消了删除操作');
        return;
    }

    console.log('✅ 用户确认删除所有用户');

    // 检查Wails绑定
    if (typeof window.go === 'undefined' || typeof window.go.main === 'undefined' || typeof window.go.main.App === 'undefined') {
        console.error('❌ Wails绑定未初始化');
        alert('错误：无法连接到后端');
        return;
    }

    if (typeof window.go.main.App.DeleteAllUsers !== 'function') {
        console.error('❌ DeleteAllUsers方法不存在');
        alert('错误：DeleteAllUsers方法不存在');
        return;
    }

    try {
        console.log('📞 准备调用 window.go.main.App.DeleteAllUsers');

        await window.go.main.App.DeleteAllUsers();
        console.log('✅ 删除所有用户成功');

        // 立即清空用户列表显示
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无用户，请添加用户</p>';
        }
        
        // 立即更新用户计数
        const userCount = document.getElementById('userCount');
        if (userCount) {
            userCount.textContent = '(0人)';
        }

        // 重新加载数据以更新统计信息和其他数据
        console.log('🔄 重新加载数据...');
        try {
            await loadData();
            console.log('✅ 数据加载完成');
        } catch (loadError) {
            console.error('加载数据时出错:', loadError);
            // 即使加载失败，也确保界面已更新
            const stats = await window.go.main.App.GetStatistics();
            if (stats) {
                updateStats(stats);
            }
        }

        alert('所有用户已删除！');
        console.log('🎉 删除所有用户操作完成');
    } catch (error) {
        console.error('❌ 删除所有用户失败，详细错误:');
        console.error('错误对象:', error);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);

        const errorMsg = error.message || error.toString() || String(error);
        alert('删除所有用户失败: ' + errorMsg);
    }
}

// 添加用户
async function addUser(event) {
    event.preventDefault();

    let name = document.getElementById('userName').value.trim();
    const photoInput = document.getElementById('userPhoto');

    // 如果没有填姓名，尝试从照片文件名提取
    if (!name && photoInput && photoInput.files && photoInput.files.length > 0) {
        const fileName = photoInput.files[0].name;
        // 移除文件扩展名作为姓名
        name = fileName.replace(/\.[^/.]+$/, '');
        if (name) {
            document.getElementById('userName').value = name;
        }
    }

    // 如果还是没有姓名，使用默认值
    if (!name) {
        name = '用户' + Date.now();
    }

    try {
        await window.go.main.App.AddUser(name, currentPhotoBase64);
        closeModal('addUserModal');
        // 清空表单
        document.getElementById('userName').value = '';
        document.getElementById('userPhoto').value = '';
        currentPhotoBase64 = '';
        document.getElementById('photoPreview').innerHTML = '';
        loadData();
    } catch (error) {
        alert('添加用户失败: ' + error);
    }
}

// 删除用户（全局函数）
window.deleteUser = async function deleteUser(userId) {
    console.log('🚀 deleteUser函数被调用');
    console.log('参数userId:', userId);
    console.log('参数类型:', typeof userId);

    if (!userId) {
        console.error('❌ 用户ID为空');
        alert('用户ID为空，无法删除');
        return;
    }

    console.log('显示确认对话框...');

    // 使用自定义模态框替代浏览器confirm，确保在Wails中可见
    const confirmed = await showConfirmDialog(
        '确认删除用户',
        '确定要删除这个用户吗？\n\n此操作不可撤销！',
        '确认删除',
        '取消'
    );

    console.log('确认对话框结果:', confirmed);

    if (!confirmed) {
        console.log('用户取消了删除操作');
        return;
    }

    console.log('✅ 用户确认删除');

    // 检查Wails绑定
    if (typeof window.go === 'undefined') {
        console.error('❌ window.go 未定义');
        alert('错误：无法连接到后端，请刷新页面重试');
        return;
    }

    if (typeof window.go.main === 'undefined') {
        console.error('❌ window.go.main 未定义');
        alert('错误：后端模块未初始化');
        return;
    }

    if (typeof window.go.main.App === 'undefined') {
        console.error('❌ window.go.main.App 未定义');
        alert('错误：App对象未绑定');
        return;
    }

    if (typeof window.go.main.App.DeleteUser !== 'function') {
        console.error('❌ DeleteUser方法不存在');
        console.log('可用的方法:', Object.keys(window.go.main.App));
        alert('错误：DeleteUser方法不存在');
        return;
    }

    try {
        console.log('📞 准备调用 window.go.main.App.DeleteUser');
        console.log('调用参数:', userId);

        const result = await window.go.main.App.DeleteUser(userId);
        console.log('✅ 删除用户成功，返回值:', result);

        // 重新加载数据
        console.log('🔄 重新加载数据...');
        await loadData();
        console.log('✅ 数据加载完成');

        console.log('🎉 删除用户操作完成');
    } catch (error) {
        console.error('❌ 删除用户失败，详细错误:');
        console.error('错误对象:', error);
        console.error('错误类型:', typeof error);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
        console.error('错误字符串:', error.toString());

        const errorMsg = error.message || error.toString() || String(error);
        alert('删除用户失败: ' + errorMsg);
    }
}

// 添加奖项
async function addPrize(event) {
    event.preventDefault();

    const name = document.getElementById('prizeName').value.trim();
    const description = document.getElementById('prizeDescription').value.trim();
    const count = parseInt(document.getElementById('prizeCount').value);
    const level = parseInt(document.getElementById('prizeLevel').value);

    if (!name || count < 1) {
        alert('请填写完整的奖项信息');
        return;
    }

    try {
        await window.go.main.App.AddPrize(name, description, count, level);
        closeModal('addPrizeModal');
        loadData();
    } catch (error) {
        alert('添加奖项失败: ' + error);
    }
}

// 删除奖项（全局函数）
window.deletePrize = async function deletePrize(prizeId) {
    console.log('🚀 deletePrize函数被调用');
    console.log('参数prizeId:', prizeId);

    if (!prizeId) {
        console.error('❌ 奖项ID为空');
        alert('奖项ID为空，无法删除');
        return;
    }

    console.log('显示确认对话框（奖项）...');

    // 使用自定义模态框
    const confirmed = await showConfirmDialog(
        '确认删除奖项',
        '确定要删除这个奖项吗？\n\n此操作不可撤销！',
        '确认删除',
        '取消'
    );

    console.log('确认对话框结果:', confirmed);

    if (!confirmed) {
        console.log('用户取消了删除操作');
        return;
    }

    console.log('✅ 用户确认删除奖项');

    console.log('✅ 用户确认删除，开始执行删除操作');

    // 检查Wails绑定
    if (typeof window.go === 'undefined' || typeof window.go.main === 'undefined' || typeof window.go.main.App === 'undefined') {
        console.error('❌ Wails绑定未初始化');
        alert('错误：无法连接到后端');
        return;
    }

    if (typeof window.go.main.App.DeletePrize !== 'function') {
        console.error('❌ DeletePrize方法不存在');
        alert('错误：DeletePrize方法不存在');
        return;
    }

    try {
        console.log('📞 准备调用 window.go.main.App.DeletePrize');
        console.log('调用参数:', prizeId);

        const result = await window.go.main.App.DeletePrize(prizeId);
        console.log('✅ 删除奖项成功，返回值:', result);

        console.log('🔄 重新加载数据...');
        await loadData();
        console.log('✅ 数据加载完成');

        console.log('🎉 删除奖项操作完成');
    } catch (error) {
        console.error('❌ 删除奖项失败，详细错误:');
        console.error('错误对象:', error);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);

        const errorMsg = error.message || error.toString() || String(error);
        alert('删除奖项失败: ' + errorMsg);
    }
}

// 开始抽奖（普通模式）
async function startDraw() {
    if (isFullscreen) {
        await startDrawFullscreen();
        return;
    }

    if (isDrawing) return;

    const prizeId = document.getElementById('prizeSelect').value;
    if (!prizeId) {
        alert('请先选择奖项');
        return;
    }

    // 获取可参与抽奖的用户
    const availableUsers = await window.go.main.App.GetAvailableUsers();
    if (availableUsers.length === 0) {
        alert('没有可参与抽奖的用户');
        return;
    }

    isDrawing = true;
    document.getElementById('drawBtn').disabled = true;

    const lotteryDisplay = document.getElementById('lotteryDisplay');

    // 获取设置的抽奖时长
    const durationInput = document.getElementById('drawDuration');
    const duration = durationInput ? parseInt(durationInput.value) || 4 : 4;
    const animationDuration = duration * 1000; // 转换为毫秒

    // 保存设置到localStorage
    localStorage.setItem('drawDuration', duration.toString());
    drawDuration = duration;

    const startTime = Date.now();
    let lastSwitchTime = startTime;

    // 保存动画上下文，以便全屏切换时继续
    const animationContext = {
        startTime: startTime,
        lastSwitchTime: lastSwitchTime,
        animationDuration: animationDuration,
        prizeId: prizeId,
        availableUsers: availableUsers,
        targetDisplay: lotteryDisplay
    };
    currentAnimationContext = animationContext;

    // 缓动函数：ease-in-out (开始慢，中间快，最后慢)
    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate() {
        // 如果动画上下文被更新（全屏切换），使用新的上下文
        const ctx = currentAnimationContext || animationContext;
        const targetDisplay = isFullscreen ?
            (document.getElementById('fullscreenDisplay') || ctx.targetDisplay) :
            (document.getElementById('lotteryDisplay') || ctx.targetDisplay);

        if (!targetDisplay) {
            return;
        }

        // 获取或创建内容容器（保留背景元素）
        let contentContainer = targetDisplay.querySelector('.lottery-content');
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'lottery-content';
            targetDisplay.appendChild(contentContainer);
        }

        const currentTime = Date.now();
        const elapsed = currentTime - ctx.startTime;
        const progress = Math.min(elapsed / ctx.animationDuration, 1);

        if (progress >= 1) {
            // 动画结束，执行抽奖
            currentAnimation = null;
            currentAnimationContext = null;
            performDraw(ctx.prizeId);
            return;
        }

        // 使用缓动函数计算当前应该的切换间隔
        // 开始慢（间隔长），中间快（间隔短），最后慢（间隔长）
        const easedProgress = easeInOut(progress);
        // 基础间隔从200ms逐渐减少到30ms，然后再增加到200ms
        const minInterval = 30;
        const maxInterval = 200;
        // 使用缓动函数：开始和结束慢，中间快
        const currentInterval = maxInterval - (maxInterval - minInterval) * (1 - Math.abs(easedProgress * 2 - 1));

        // 如果到了切换时间，更新显示
        if (currentTime - ctx.lastSwitchTime >= currentInterval) {
            ctx.lastSwitchTime = currentTime;

            // 随机选择一个用户显示
            const randomIndex = Math.floor(Math.random() * ctx.availableUsers.length);
            const user = ctx.availableUsers[randomIndex];

            // 如果没有照片，显示大号姓名
            if (user.photo) {
                contentContainer.innerHTML = `
                    <div class="lottery-animation">
                        <img src="${user.photo}" alt="${user.name}">
                        <div class="name">${user.name}</div>
                    </div>
                `;
            } else {
                contentContainer.innerHTML = `
                    <div class="lottery-animation">
                        <div class="name-only" style="font-size: 120px; font-weight: bold; color: white; text-shadow: 3px 3px 6px rgba(0,0,0,0.5);">${user.name}</div>
                    </div>
                `;
            }
        }

        // 使用requestAnimationFrame实现流畅动画
        requestAnimationFrame(animate);
    }

    // 保存动画函数引用
    currentAnimation = animate;

    // 启动动画
    animate();
}

// 执行抽奖（普通模式）
async function performDraw(prizeId) {
    try {
        const result = await window.go.main.App.DrawLottery(prizeId);

        const lotteryDisplay = document.getElementById('lotteryDisplay');
        const fullscreenDisplay = document.getElementById('fullscreenDisplay');

        if (result.success) {
            // 显示结果，明确显示奖项信息
            // 如果没有照片，不显示照片框，只显示名称
            const resultHTML = `
                <div class="lottery-result">
                    ${result.userPhoto ? `<img src="${result.userPhoto}" alt="${result.userName}">` : ''}
                    <div class="name">${result.userName}</div>
                    <div class="prize-label">恭喜获得</div>
                    <div class="prize">🎉 ${result.prizeName} 🎉</div>
                </div>
            `;

            // 只更新内容容器，保留背景
            let contentContainer = lotteryDisplay.querySelector('.lottery-content');
            if (!contentContainer) {
                contentContainer = document.createElement('div');
                contentContainer.className = 'lottery-content';
                lotteryDisplay.appendChild(contentContainer);
            }
            contentContainer.innerHTML = resultHTML;

            if (fullscreenDisplay && isFullscreen) {
                let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
                if (!fullscreenContent) {
                    fullscreenContent = document.createElement('div');
                    fullscreenContent.className = 'lottery-content';
                    fullscreenDisplay.appendChild(fullscreenContent);
                }
                fullscreenContent.innerHTML = resultHTML;
            }

            // 保存当前选择的奖项ID
            const currentPrizeId = prizeId;
            
            // 更新数据
            await loadData();
            
            // 检查奖项是否还有剩余名额，决定是否保留选择
            const prizes = await window.go.main.App.GetPrizes();
            const currentPrize = Array.isArray(prizes) ? prizes.find(p => p.id === currentPrizeId) : null;
            
            const prizeSelect = document.getElementById('prizeSelect');
            const fullscreenPrizeSelect = document.getElementById('fullscreenPrizeSelect');
            
            if (currentPrize && currentPrize.drawnCount < currentPrize.count) {
                // 还有剩余名额，保留选择
                if (prizeSelect) prizeSelect.value = currentPrizeId;
                if (fullscreenPrizeSelect) fullscreenPrizeSelect.value = currentPrizeId;
            } else {
                // 没有剩余名额，清空选择
                if (prizeSelect) prizeSelect.value = '';
                if (fullscreenPrizeSelect) fullscreenPrizeSelect.value = '';
            }

            // 抽奖结束，不再显示确认对话框
        } else {
            alert(result.message);
            let contentContainer = lotteryDisplay.querySelector('.lottery-content');
            if (contentContainer) {
                contentContainer.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
            if (fullscreenDisplay && isFullscreen) {
                let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
                if (fullscreenContent) {
                    fullscreenContent.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
                }
            }
        }
    } catch (error) {
        alert('抽奖失败: ' + error);
        const lotteryDisplay = document.getElementById('lotteryDisplay');
        if (lotteryDisplay) {
            let contentContainer = lotteryDisplay.querySelector('.lottery-content');
            if (contentContainer) {
                contentContainer.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
        }
    } finally {
        isDrawing = false;
        document.getElementById('drawBtn').disabled = false;
    }
}

// 重置抽奖
async function resetLottery() {
    // 使用自定义确认对话框
    const confirmed = await showConfirmDialog(
        '确认重置抽奖',
        '确定要重置抽奖吗？\n\n这将清空所有中奖记录，所有用户可以重新参与抽奖。\n\n此操作不可撤销！',
        '确认重置',
        '取消'
    );

    if (!confirmed) {
        console.log('用户取消了重置操作');
        return;
    }

    console.log('✅ 用户确认重置抽奖');

    try {
        console.log('开始重置抽奖...');
        await window.go.main.App.ResetLottery();
        console.log('重置抽奖成功');

        // 重置普通模式显示
        const lotteryDisplay = document.getElementById('lotteryDisplay');
        if (lotteryDisplay) {
            let contentContainer = lotteryDisplay.querySelector('.lottery-content');
            if (contentContainer) {
                contentContainer.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
        }

        // 重置全屏模式显示
        const fullscreenDisplay = document.getElementById('fullscreenDisplay');
        if (fullscreenDisplay) {
            let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
            if (fullscreenContent) {
                fullscreenContent.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
        }

        // 重新加载数据以更新界面
        console.log('重新加载数据...');
        await loadData();
        console.log('数据加载完成');

        alert('抽奖已重置！所有用户可以重新参与抽奖。');
    } catch (error) {
        console.error('重置失败:', error);
        alert('重置失败: ' + (error.message || error));
    }
}

// 点击模态框外部关闭
window.onclick = function (event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// 全屏模式切换
function toggleFullscreen() {
    const fullscreenLottery = document.getElementById('fullscreenLottery');
    const fullscreenIcon = document.getElementById('fullscreenIcon');

    if (!isFullscreen) {
        // 进入全屏模式
        isFullscreen = true;
        fullscreenLottery.classList.add('active');
        document.body.style.overflow = 'hidden';

        // 同步奖项选择
        const prizeSelect = document.getElementById('prizeSelect');
        const fullscreenPrizeSelect = document.getElementById('fullscreenPrizeSelect');
        if (prizeSelect && fullscreenPrizeSelect) {
            fullscreenPrizeSelect.value = prizeSelect.value;
        }

        // 同步时长设置
        const durationInput = document.getElementById('drawDuration');
        const fullscreenDurationInput = document.getElementById('fullscreenDrawDuration');
        if (durationInput && fullscreenDurationInput) {
            fullscreenDurationInput.value = durationInput.value;
        }

        // 重新绑定全屏输入框的事件（确保上下键可用）
        setTimeout(function () {
            const fullscreenInput = document.getElementById('fullscreenDrawDuration');
            if (fullscreenInput && typeof window.setupNumberInputKeydown === 'function') {
                window.setupNumberInputKeydown(fullscreenInput);
            }
        }, 100);

        // 如果正在抽奖动画中，不替换innerHTML，而是让动画继续更新正确的元素
        // 动画会通过currentAnimationContext自动切换到全屏显示
        if (!isDrawing || !currentAnimationContext) {
            // 只在没有动画运行时才同步显示内容
            const lotteryDisplay = document.getElementById('lotteryDisplay');
            const fullscreenDisplay = document.getElementById('fullscreenDisplay');
            if (lotteryDisplay && fullscreenDisplay) {
                const lotteryContent = lotteryDisplay.querySelector('.lottery-content');
                let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
                if (!fullscreenContent) {
                    fullscreenContent = document.createElement('div');
                    fullscreenContent.className = 'lottery-content';
                    fullscreenDisplay.appendChild(fullscreenContent);
                }
                if (lotteryContent) {
                    fullscreenContent.innerHTML = lotteryContent.innerHTML;
                }
            }
        }
    } else {
        // 退出全屏模式
        isFullscreen = false;
        fullscreenLottery.classList.remove('active');
        document.body.style.overflow = '';

        // 同步时长设置
        const durationInput = document.getElementById('drawDuration');
        const fullscreenDurationInput = document.getElementById('fullscreenDrawDuration');
        if (fullscreenDurationInput && durationInput) {
            durationInput.value = fullscreenDurationInput.value;
        }

        // 如果正在抽奖动画中，不替换innerHTML，而是让动画继续更新正确的元素
        if (!isDrawing || !currentAnimationContext) {
            // 只在没有动画运行时才同步显示内容
            const lotteryDisplay = document.getElementById('lotteryDisplay');
            const fullscreenDisplay = document.getElementById('fullscreenDisplay');
            if (fullscreenDisplay && lotteryDisplay) {
                const fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
                let lotteryContent = lotteryDisplay.querySelector('.lottery-content');
                if (!lotteryContent) {
                    lotteryContent = document.createElement('div');
                    lotteryContent.className = 'lottery-content';
                    lotteryDisplay.appendChild(lotteryContent);
                }
                if (fullscreenContent) {
                    lotteryContent.innerHTML = fullscreenContent.innerHTML;
                }
            }
        }
    }
}

// 全屏模式开始抽奖
async function startDrawFullscreen() {
    if (isDrawing) return;

    const prizeId = document.getElementById('fullscreenPrizeSelect').value;
    if (!prizeId) {
        alert('请先选择奖项');
        return;
    }

    // 同步到普通模式的选项
    const prizeSelect = document.getElementById('prizeSelect');
    if (prizeSelect) {
        prizeSelect.value = prizeId;
    }

    // 调用普通抽奖函数，但使用全屏显示
    await startDrawFullscreenInternal(prizeId);
}

// 全屏模式抽奖内部函数
async function startDrawFullscreenInternal(prizeId) {
    if (isDrawing) return;

    // 获取可参与抽奖的用户
    const availableUsers = await window.go.main.App.GetAvailableUsers();
    if (availableUsers.length === 0) {
        alert('没有可参与抽奖的用户');
        return;
    }

    isDrawing = true;
    const drawBtn = document.getElementById('fullscreenDrawBtn');
    if (drawBtn) drawBtn.disabled = true;

    const fullscreenDisplay = document.getElementById('fullscreenDisplay');

    // 获取设置的抽奖时长
    const durationInput = document.getElementById('fullscreenDrawDuration');
    const duration = durationInput ? parseInt(durationInput.value) || 4 : 4;
    const animationDuration = duration * 1000; // 转换为毫秒

    // 保存设置到localStorage
    localStorage.setItem('drawDuration', duration.toString());
    drawDuration = duration;

    const startTime = Date.now();
    let lastSwitchTime = startTime;

    // 保存动画上下文，以便全屏切换时继续
    const animationContext = {
        startTime: startTime,
        lastSwitchTime: lastSwitchTime,
        animationDuration: animationDuration,
        prizeId: prizeId,
        availableUsers: availableUsers,
        targetDisplay: fullscreenDisplay
    };
    currentAnimationContext = animationContext;

    // 缓动函数：ease-in-out (开始慢，中间快，最后慢)
    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate() {
        // 如果动画上下文被更新（全屏切换），使用新的上下文
        const ctx = currentAnimationContext || animationContext;
        const targetDisplay = isFullscreen ?
            (document.getElementById('fullscreenDisplay') || ctx.targetDisplay) :
            (document.getElementById('lotteryDisplay') || ctx.targetDisplay);

        if (!targetDisplay) {
            return;
        }

        // 获取或创建内容容器（保留背景元素）
        let contentContainer = targetDisplay.querySelector('.lottery-content');
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.className = 'lottery-content';
            targetDisplay.appendChild(contentContainer);
        }

        const currentTime = Date.now();
        const elapsed = currentTime - ctx.startTime;
        const progress = Math.min(elapsed / ctx.animationDuration, 1);

        if (progress >= 1) {
            // 动画结束，执行抽奖
            currentAnimation = null;
            currentAnimationContext = null;
            performDrawFullscreen(ctx.prizeId);
            return;
        }

        // 使用缓动函数计算当前应该的切换间隔
        const easedProgress = easeInOut(progress);
        const minInterval = 30;
        const maxInterval = 200;
        const currentInterval = maxInterval - (maxInterval - minInterval) * (1 - Math.abs(easedProgress * 2 - 1));

        // 如果到了切换时间，更新显示
        if (currentTime - ctx.lastSwitchTime >= currentInterval) {
            ctx.lastSwitchTime = currentTime;

            // 随机选择一个用户显示
            const randomIndex = Math.floor(Math.random() * ctx.availableUsers.length);
            const user = ctx.availableUsers[randomIndex];

            // 如果没有照片，显示大号姓名
            if (user.photo) {
                contentContainer.innerHTML = `
                    <div class="lottery-animation">
                        <img src="${user.photo}" alt="${user.name}">
                        <div class="name">${user.name}</div>
                    </div>
                `;
            } else {
                contentContainer.innerHTML = `
                    <div class="lottery-animation">
                        <div class="name-only" style="font-size: 200px; font-weight: bold; color: white; text-shadow: 4px 4px 8px rgba(0,0,0,0.6);">${user.name}</div>
                    </div>
                `;
            }
        }

        // 使用requestAnimationFrame实现流畅动画
        requestAnimationFrame(animate);
    }

    // 保存动画函数引用
    currentAnimation = animate;

    // 启动动画
    animate();
}

// 全屏模式执行抽奖
async function performDrawFullscreen(prizeId) {
    try {
        const result = await window.go.main.App.DrawLottery(prizeId);

        const fullscreenDisplay = document.getElementById('fullscreenDisplay');
        const lotteryDisplay = document.getElementById('lotteryDisplay');

        if (result.success) {
            // 显示结果，明确显示奖项信息
            // 如果没有照片，不显示照片框，只显示名称
            const resultHTML = `
                <div class="lottery-result">
                    ${result.userPhoto ? `<img src="${result.userPhoto}" alt="${result.userName}">` : ''}
                    <div class="name">${result.userName}</div>
                    <div class="prize-label">恭喜获得</div>
                    <div class="prize">🎉 ${result.prizeName} 🎉</div>
                </div>
            `;

            // 只更新内容容器，保留背景
            let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
            if (!fullscreenContent) {
                fullscreenContent = document.createElement('div');
                fullscreenContent.className = 'lottery-content';
                fullscreenDisplay.appendChild(fullscreenContent);
            }
            fullscreenContent.innerHTML = resultHTML;

            if (lotteryDisplay) {
                let contentContainer = lotteryDisplay.querySelector('.lottery-content');
                if (!contentContainer) {
                    contentContainer = document.createElement('div');
                    contentContainer.className = 'lottery-content';
                    lotteryDisplay.appendChild(contentContainer);
                }
                contentContainer.innerHTML = resultHTML;
            }

            // 保存当前选择的奖项ID
            const currentPrizeId = prizeId;
            
            // 更新数据
            await loadData();
            
            // 检查奖项是否还有剩余名额，决定是否保留选择
            const prizes = await window.go.main.App.GetPrizes();
            const currentPrize = Array.isArray(prizes) ? prizes.find(p => p.id === currentPrizeId) : null;
            
            const prizeSelect = document.getElementById('prizeSelect');
            const fullscreenPrizeSelect = document.getElementById('fullscreenPrizeSelect');
            
            if (currentPrize && currentPrize.drawnCount < currentPrize.count) {
                // 还有剩余名额，保留选择
                if (prizeSelect) prizeSelect.value = currentPrizeId;
                if (fullscreenPrizeSelect) fullscreenPrizeSelect.value = currentPrizeId;
            } else {
                // 没有剩余名额，清空选择
                if (prizeSelect) prizeSelect.value = '';
                if (fullscreenPrizeSelect) fullscreenPrizeSelect.value = '';
            }

            // 抽奖结束，不再显示确认对话框
        } else {
            alert(result.message);
            let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
            if (fullscreenContent) {
                fullscreenContent.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
            if (lotteryDisplay) {
                let contentContainer = lotteryDisplay.querySelector('.lottery-content');
                if (contentContainer) {
                    contentContainer.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
                }
            }
        }
    } catch (error) {
        alert('抽奖失败: ' + error);
        const fullscreenDisplay = document.getElementById('fullscreenDisplay');
        if (fullscreenDisplay) {
            let fullscreenContent = fullscreenDisplay.querySelector('.lottery-content');
            if (fullscreenContent) {
                fullscreenContent.innerHTML = '<div class="lottery-placeholder"><p>点击"开始抽奖"按钮开始</p></div>';
            }
        }
    } finally {
        isDrawing = false;
        const drawBtn = document.getElementById('fullscreenDrawBtn');
        if (drawBtn) drawBtn.disabled = false;
    }
}

// 显示中奖列表
async function showWinnersModal() {
    try {
        const wonUsers = await window.go.main.App.GetWonUsers();
        const winnersList = document.getElementById('winnersList');

        if (wonUsers.length === 0) {
            winnersList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无中奖用户</p>';
        } else {
            winnersList.innerHTML = '';
            wonUsers.forEach((user, index) => {
                const winnerItem = document.createElement('div');
                winnerItem.className = 'winner-item';
                winnerItem.innerHTML = `
                    <div class="winner-info">
                        ${user.photo ? `<img src="${user.photo}" alt="${user.name}" class="winner-photo">` : `<div class="winner-photo-placeholder">${user.name.charAt(0)}</div>`}
                        <div class="winner-details">
                            <div class="winner-name">${user.name}</div>
                            <div class="winner-prize">🏆 ${user.prizeName || '未知奖项'}</div>
                            <div class="winner-time">${user.wonTime || ''}</div>
                        </div>
                    </div>
                `;
                winnersList.appendChild(winnerItem);
            });
        }

        document.getElementById('winnersModal').style.display = 'block';
    } catch (error) {
        console.error('加载中奖列表失败:', error);
        alert('加载中奖列表失败: ' + error);
    }
}

// 显示CSV导入模态框
function showImportCSVModal() {
    document.getElementById('importCSVModal').style.display = 'block';
    document.getElementById('csvData').value = '';
    document.getElementById('csvFile').value = '';
}

// 显示文件夹导入模态框
function showImportFolderModal() {
    const modal = document.getElementById('importFolderModal');
    const folderInput = document.getElementById('folderInput');
    const folderPreview = document.getElementById('folderPreview');

    modal.style.display = 'block';
    folderInput.value = '';
    folderPreview.innerHTML = '<p style="color: #999; text-align: center;">选择文件夹后将显示预览</p>';

    // 监听文件夹选择
    folderInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        if (files.length === 0) {
            folderPreview.innerHTML = '<p style="color: #d32f2f; text-align: center;">文件夹中没有图片文件</p>';
            return;
        }

        let previewHTML = `<p style="margin-bottom: 10px; font-weight: bold;">找到 ${files.length} 张图片：</p>`;
        previewHTML += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">';

        files.forEach((file, index) => {
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.querySelector(`#folderPreview img[data-index="${index}"]`);
                if (img) {
                    img.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);

            previewHTML += `
                <div style="text-align: center;">
                    <img data-index="${index}" src="" alt="${fileName}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 5px; border: 1px solid #ddd; background: #f0f0f0;">
                    <p style="font-size: 12px; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${fileName}">${fileName}</p>
                </div>
            `;
        });

        previewHTML += '</div>';
        folderPreview.innerHTML = previewHTML;
    });
}

// 从文件夹导入用户
async function importUsersFromFolder(event) {
    event.preventDefault();

    const folderInput = document.getElementById('folderInput');
    const files = Array.from(folderInput.files).filter(file => file.type.startsWith('image/'));

    if (files.length === 0) {
        alert('请选择包含图片的文件夹');
        return;
    }

    console.log(`准备导入 ${files.length} 个用户`);

    try {
        let successCount = 0;
        let errorCount = 0;

        // 逐个处理文件
        for (const file of files) {
            try {
                // 从文件名提取姓名（移除扩展名）
                const name = file.name.replace(/\.[^/.]+$/, '');
                if (!name) {
                    console.warn(`跳过无效文件名: ${file.name}`);
                    errorCount++;
                    continue;
                }

                // 读取图片为base64
                const photoBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                // 添加用户
                await window.go.main.App.AddUser(name, photoBase64);
                successCount++;
                console.log(`成功导入: ${name}`);
            } catch (error) {
                console.error(`导入失败 ${file.name}:`, error);
                errorCount++;
            }
        }

        closeModal('importFolderModal');

        // 清空表单
        folderInput.value = '';
        document.getElementById('folderPreview').innerHTML = '<p style="color: #999; text-align: center;">选择文件夹后将显示预览</p>';

        // 重新加载数据
        await loadData();

        // 显示结果
        if (errorCount > 0) {
            alert(`导入完成！\n成功: ${successCount} 个\n失败: ${errorCount} 个`);
        } else {
            alert(`成功导入 ${successCount} 个用户！`);
        }
    } catch (error) {
        console.error('导入用户失败:', error);
        alert('导入用户失败: ' + (error.message || error));
    }
}

// 处理CSV文件上传
function handleCSVFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('csvData').value = e.target.result;
    };
    reader.readAsText(file);
}

// CSV导入用户
async function importUsersFromCSV(event) {
    event.preventDefault();

    const csvData = document.getElementById('csvData').value.trim();
    if (!csvData) {
        alert('请输入CSV数据');
        return;
    }

    try {
        const count = await window.go.main.App.ImportUsersFromCSV(csvData);
        closeModal('importCSVModal');
        await loadData();
        alert(`成功导入 ${count} 个用户！`);
    } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败: ' + (error.message || error));
    }
}

// 点击模态框外部关闭
window.onclick = function (event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

