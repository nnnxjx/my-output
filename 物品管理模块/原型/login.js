// 从CSV文件读取用户数据
let usersData = [];

// 读取CSV文件
function loadUsersData() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'users.csv', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                const csvText = xhr.responseText;
                const lines = csvText.split('\n');
                const headers = lines[0].split(',');
                
                usersData = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    if (values.length >= 4) {
                        const user = {
                            username: values[0].trim(),
                            password: values[1].trim(),
                            identity: values[2].trim(),
                            area: values[3].trim()
                        };
                        usersData.push(user);
                    }
                }
                console.log('Loaded users data from CSV:', usersData);
                resolve(usersData);
            } else {
                reject(new Error('Failed to load users.csv file'));
            }
        };
        xhr.onerror = function() {
            reject(new Error('Error loading users.csv file'));
        };
        xhr.send();
    });
}

// 页面加载时读取用户数据
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始加载用户数据');
    loadUsersData().then(data => {
        console.log('用户数据加载成功:', data);
    }).catch(error => {
        console.error('Error loading users data:', error);
        console.log('Failed to load users data from CSV');
        // 直接使用默认用户数据作为备份
        usersData = [
            { username: 'admin', password: '123', identity: '总部综管员', area: '' },
            { username: 'nfmanager', password: '123', identity: '片区长', area: '北一片区' },
            { username: 'nmanager', password: '123', identity: '片区长', area: '北二片区' },
            { username: 'emanager', password: '123', identity: '片区长', area: '东片区' },
            { username: 'cmanager', password: '123', identity: '片区长', area: '中片区' },
            { username: 'smanager', password: '123', identity: '片区长', area: '西南片区' },
            { username: 'yfmanager', password: '123', identity: '片区长', area: '益丰' },
            { username: 'nfstaff', password: '123', identity: '片区综管员', area: '北一片区' },
            { username: 'nstaff', password: '123', identity: '片区综管员', area: '北二片区' },
            { username: 'estaff', password: '123', identity: '片区综管员', area: '东片区' },
            { username: 'cstaff', password: '123', identity: '片区综管员', area: '中片区' },
            { username: 'sstaff', password: '123', identity: '片区综管员', area: '西南片区' },
            { username: 'yfstaff', password: '123', identity: '片区综管员', area: '益丰' }
        ];
        console.log('使用默认用户数据:', usersData);
    }).finally(() => {
        // 检查是否已登录
        const user = localStorage.getItem('user');
        if (user) {
            // 已登录，跳转到库存管理页面
            window.location.href = 'inventory.html';
        }
    });
});

// 登录表单提交事件
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 获取表单数据
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const identity = document.getElementById('identity').value;
    
    // 验证必填字段
    if (!username || !password || !identity) {
        showError('请填写完整的登录信息');
        return;
    }
    
    // 检查用户数据是否加载成功
    if (usersData.length === 0) {
        showError('用户数据加载失败，请刷新页面重试');
        return;
    }
    
    console.log('尝试登录:', { username, password, identity });
    
    // 使用从CSV加载的用户数据验证
    const user = usersData.find(user => {
        console.log('比较用户:', {
            csvUser: { username: user.username, password: user.password, identity: user.identity },
            input: { username, password, identity },
            matches: user.username === username && user.password === password && user.identity === identity
        });
        return user.username === username && 
               user.password === password && 
               user.identity === identity;
    });
    
    if (user) {
        console.log('登录成功，用户信息:', user);
        // 登录成功，保存用户信息到localStorage
        try {
            localStorage.setItem('user', JSON.stringify({
                username: user.username,
                identity: user.identity,
                area: user.area || ''
            }));
            console.log('保存到localStorage成功');
            // 跳转到库存管理页面
            window.location.href = 'inventory.html';
        } catch (storageError) {
            console.error('localStorage错误:', storageError);
            showError('无法保存登录状态，请检查浏览器设置');
        }
    } else {
        // 登录失败
        console.log('登录失败，未找到匹配用户');
        showError('账号、密码或身份信息错误');
    }
});

// 显示错误消息
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    
    // 3秒后自动隐藏错误消息
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}