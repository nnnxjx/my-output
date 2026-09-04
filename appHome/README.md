# appHome 密码过期前 X 天提醒逻辑说明

## 1. 这个模块解决什么问题

`appHome` 页面在用户进入首页时，会自动检查当前账号的密码是否已经进入“即将过期”的提醒窗口。

它的目标不是等密码真正过期，而是：

- 提前计算密码已经使用了多少天；
- 判断是否进入预警区间；
- 一旦进入预警区间，就在首页弹出提醒；
- 用户再通过弹窗进入改密流程完成密码更新。

> 备注：代码的设计思路是“过期前 X 天提醒”，但当前实现里提醒窗口阈值写死为 `180`，不是 7 天。若要按“前 7 天提醒”，把阈值改为 7 即可。

---

## 2. 整个逻辑链路总览

```text
用户进入 appHome
  └─► mounted 执行
        └─► 从 localStorage 取出：cescUserName、cescPassword、userInfo
              └─► 从 userInfo 中取 pwdUpdateDate / systemDate
                    └─► 调用 loginService.checkIfNeedUpdatePassword(...)
                          ├─► 校验 pwdUpdateDate / systemDate 是否存在
                          ├─► 向后端请求密码策略字典 pwd_refresh_day
                          ├─► 计算密码已使用天数 timeGap
                          ├─► 判断是否落入“到期前提醒窗口”
                          │     └─► 若命中：
                          │           ├─► 计算剩余天数 days
                          │           ├─► 写入 changePassword.days
                          │           └─► 打开 changePassword.showDialog
                          └─► 若未命中：不弹提醒

首页弹出提醒框
  └─► 展示“密码还有 N 天过期，请及时修改密码”
  └─► 用户点击“修改密码”
        └─► showChangePassword()
              └─► this.$refs.changePassword.show()
                    └─► 打开独立改密组件

改密组件提交
  └─► 校验原密码 / 新密码 / 确认密码
  └─► 通过后调用 updatePasswordV2
        └─► AES 加密密码
        └─► 调用后端改密接口 modifyPassword
        └─► 成功后刷新页面，完成闭环
```

下面按这个链路逐段贴出对应代码。

---

## 3. 阶段一：首页初始化，读取用户状态

首页组件的 `data` 中预先声明了承载检查结果的对象，`showDialog` 控制提醒弹窗显隐，`days` 存剩余天数：

```js
// src/modules/appHome/index.js
changePassword: {
    showDialog: false,          // 是否显示提示弹窗
    days: 0,                    // 密码还有多少天过期
    showChangePassword: false,  // 是否显示修改密码弹窗
},
```

首页挂载（`mounted`）时，从本地缓存取出账号、密码和用户信息，随后立即触发过期检查：

```js
// src/modules/appHome/index.js
mounted: function () {
    const cescUserName = window.localStorage.getItem('cescUserName');
    const password = window.localStorage.getItem('cescPassword');
    const userInfo = JSON.parse(window.localStorage.getItem('userInfo'));
    const pwdUpdateDate = userInfo.pwdUpdateDate;   // 密码上次修改时间
    const systemDate = userInfo.systemDate;         // 后端返回的系统时间
    // ... 其他初始化逻辑 ...

    loginService.checkIfNeedUpdatePassword(cescUserName, password, pwdUpdateDate, systemDate, this.changePassword);
},
```

这一步拿到的是“判断密码是否快过期”所需的两个时间基准：`pwdUpdateDate` 和 `systemDate`。注意最后把 `this.changePassword` 整个传了进去，后面检查命中时直接写这个响应式对象来驱动弹窗。

---

## 4. 阶段二：核心检查逻辑 checkIfNeedUpdatePassword

这是整条链路的核心，位于 `src/services/loginService.js`，完整代码如下：

```js
// src/services/loginService.js
// 检查是否要修改密码 返回true需要修改密码 false不需要修改密码
checkIfNeedUpdatePassword(userName, password, pwdUpdateDate, systemDate, changePassword) {
    // 1. 基础校验：两个时间字段必须存在
    if (!pwdUpdateDate || !systemDate) {
        Notification.warning({
            title: '提示',
            message: '密码有效期校验失败：后台接口未返回pwdUpdateDate或systemDate字段',
        });
        return false;
    }

    // 2. 拉取密码策略字典（带缓存）
    pipeService.getCommonsDict({
        needCache: true,
        groupDirt: 'pwd_refresh_day',
    }, (res) => {
        // 3. 字典未配置：直接失败
        if (!res || !res.length) {
            Notification.warning({
                title: '提示',
                message: '密码有效期校验失败：未配置密码有效期字典pwd_refresh_day',
            });
            return false;
        }

        // 4. 计算密码已使用天数：(系统时间 - 密码更新时间) 换算成天
        const timeGap = (new Date(systemDate).getTime() - new Date(pwdUpdateDate).getTime()) / 1000 / 60 / 60 / 24;

        // 5. 时间源异常：系统时间早于密码更新时间
        if (timeGap < 0) {
            Notification.warning({
                title: '提示',
                message: '密码有效期校验失败：系统时间(systemDate)早于密码更新时间(pwdUpdateDate)',
            });
            return false;
        }

        // 6. 从字典取“密码有效期”，提醒阈值当前硬编码为 180 天
        const pwdExpirationDayItem = res.find(item => item.text === '密码过期修改时间');
        // const pwdExpirationReminderDayItem = res.find(item => item.text === '即将过期提示时间');
        const pwdExpirationReminderDayItem = { value: '180' };

        // 7. 判断是否进入提醒窗口：
        //    未过期 且 已使用天数 > (有效期 - 提醒阈值)
        if (pwdExpirationDayItem
            && pwdExpirationReminderDayItem
            && timeGap < Number(pwdExpirationDayItem.value)
            && timeGap > (Number(pwdExpirationDayItem.value) - Number(pwdExpirationReminderDayItem.value))
        ) {
            // 8. 计算剩余天数，最小为 1，写回首页的响应式对象
            let days = parseInt(Number(pwdExpirationDayItem.value) - timeGap);
            if (days < 1) {
                days = 1;
            }
            changePassword.days = days;
            changePassword.showDialog = true;
            return true;
        }
        return false;
    });
},
```

其中字典接口 `getCommonsDict` 来自 `src/services/pipeService.js`：

```js
// src/services/pipeService.js
getCommonsDict: function (param, cb, fail) {
    sendGet('getCommonsDict', param, cb, fail)
},
```

判断的数学含义：设密码有效期为 `E` 天、提醒阈值为 `W` 天，则当密码已使用天数 `timeGap` 满足

```text
E - W  <  timeGap  <  E
```

即“密码还没过期，但剩余可用时间已经不足 `W` 天”时触发提醒。示例：有效期 365 天、阈值 7 天时，`timeGap` 落在 `(358, 365)` 区间即触发，弹窗显示剩余 `365 - timeGap` 天。

---

## 5. 阶段三：首页弹出提醒弹窗

`changePassword.showDialog` 被置为 `true` 后，首页模板中的 `el-dialog` 自动弹出，文案中的 `{{changePassword.days}}` 就是阶段二算出的剩余天数：

```html
<!-- src/modules/appHome/index.html -->
<el-dialog
    :visible.sync="changePassword.showDialog"
    width="360px"
    custom-class="password-expire-dialog"
    :close-on-click-modal="false"
    :show-close="true"
>
    <div class="changePasswordContent">
        <div class="dialogText">密码还有{{changePassword.days}}天过期，请及时修改密码</div>
        <el-button class="dialogBtn" type="primary" @click="showChangePassword">修改密码</el-button>
    </div>
</el-dialog>

<ChangePassword ref="changePassword" />
```

---

## 6. 阶段四：点击“修改密码”，打开改密组件

首页按钮点击后，通过 `$refs` 调用子组件的 `show()` 方法：

```js
// src/modules/appHome/index.js
showChangePassword() {
    this.$refs.changePassword.show();
}
```

改密组件的 `show()` 支持外部传参配置，并控制 `visible` 显示：

```js
// src/modules/appHome/changePassword/index.js
show(options = {}) {
    if (options.title !== undefined) {
        this.title = options.title;
    }
    if (options.showCloseButton !== undefined) {
        this.showCloseButton = options.showCloseButton;
    }
    if (options.showCancelButton !== undefined) {
        this.showCancelButton = options.showCancelButton;
    }
    if (options.maskClosable !== undefined) {
        this.maskClosable = options.maskClosable;
    }

    this.visible = true;

    // 支持从外部预填账号和原密码
    if (options.userName) {
        this.form.loginAccount = options.userName;
    }
    if (options.password) {
        this.form.oldPassword = options.password;
    }
},
```

另外组件挂载时还预留了一个事件入口，任何页面都可以通过事件总线打开它：

```js
// src/modules/appHome/changePassword/index.js
mounted() {
    eventHelper.on("showChangePassword", (options) => {
        this.show(options);
    });
    // 登录账号默认从本地缓存预填
    this.form.loginAccount = localStorage.getItem("cescUserName");
},
```

---

## 7. 阶段五：改密表单校验

组件 `data` 中定义了两个自定义校验器。新密码要求长度至少 8 位，且必须同时包含数字、字母和特殊字符：

```js
// src/modules/appHome/changePassword/index.js
var validatePass = (rule, value, callback) => {
    if (value === "" || value.trim().length < 1) {
        callback(new Error("请输入密码，密码不能包含空格"));
    } else if (String(value).length < 8) {
        callback(new Error("密码长度至少8位"));
    } else if (
        !/^.*(?=.{8,})(?=.*\d)(?=.*[A-Za-z])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/.test(value)
    ) {
        callback(new Error("密码必须包含数字、大小写字母和特殊字符"));
    } else {
        callback();
    }
};

var validatePass2 = (rule, value, callback) => {
    if (value === "" || value.trim().length < 1) {
        callback(new Error("请再次输入密码，密码不能包含空格"));
    } else if (value !== this.form.newPassword) {
        callback(new Error("两次输入密码不一致!"));
    } else {
        callback();
    }
};
```

---

## 8. 阶段六：提交改密，走完整请求链

用户点击“确定”后，先校验表单，校验通过才发起请求：

```js
// src/modules/appHome/changePassword/index.js
handleSubmit() {
    this.$refs.form.validate((valid) => {
        if (valid) {
            this.updatePassword();
        } else {
            this.$dialog.toast({
                mes: "请检查输入信息",
                icon: "error",
                timeout: 1500,
            });
        }
    });
},
```

组装参数后逐层向下调用，成功则提示并刷新页面，失败则提示错误：

```js
// src/modules/appHome/changePassword/index.js
async updatePassword() {
    if (this.loading) return;
    this.loading = true;
    const params = {
        oldPassword: this.form.oldPassword,
        newPassword: this.form.newPassword,
        loginName: this.form.loginAccount,
    };
    loginCtrl.updatePasswordV2(
        params,
        (result) => {
            this.loading = false;
            this.hide();
            setTimeout(() => {
                this.$dialog.toast({
                    mes: "密码修改成功",
                    icon: "success",
                    timeout: 1500,
                    callback: () => {
                        window.location.reload();   // 改密成功后刷新页面
                    },
                });
            }, 100);
        },
        (error) => {
            this.loading = false;
            this.hide();
            setTimeout(() => {
                this.$dialog.toast({
                    mes: error.msg || "密码修改失败",
                    icon: "error",
                    timeout: 1500,
                });
            }, 100);
        }
    );
},
```

控制层只是透传：

```js
// src/controllers/loginController.js
updatePasswordV2: function (param, cb, errorCb) {
    loginService.updatePasswordV2(param, cb, errorCb);
}
```

服务层指定真实接口名为 `modifyPassword`：

```js
// src/services/loginService.js
updatePasswordV2: function (form, cb, errorCb) {
    serviceHelper.requestByGetAndEncrypt('modifyPassword', form, cb, errorCb);
},
```

最终由 `serviceHelper` 对新旧密码做 AES 加密后发起请求：

```js
// src/services/serviceHelper.js
requestByGetAndEncrypt(name, param, cb, fail) {
    const fullUrl = serviceEndpoint[name];
    $axios.get(fullUrl, {}, {
        headers: {
            ctoken: this.getToken()
        },
        params: {
            oldPassword: AES.encrypt(param.oldPassword).toString(),
            newPassword: AES.encrypt(param.newPassword).toString(),
            loginName: param.loginName
        }
    }).then((result) => {
        if (!!result.success) {
            cb(result.data);
        } else {
            fail && fail(result.msg)
        }
    });
},
```

改密成功后 `window.location.reload()` 刷新页面，新的 `pwdUpdateDate` 会随重新加载生效，提醒自然消失，业务闭环完成。

---

## 9. 异常兜底汇总

链路中每一处可能失败的情况都有显式拦截，不会静默跳过：

| 场景 | 处理 |
| --- | --- |
| 后端未返回 `pwdUpdateDate` / `systemDate` | 警告“后台接口未返回pwdUpdateDate或systemDate字段”，不提醒 |
| 字典 `pwd_refresh_day` 为空或未配置 | 警告“未配置密码有效期字典pwd_refresh_day”，不提醒 |
| `systemDate` 早于 `pwdUpdateDate` | 警告“系统时间(systemDate)早于密码更新时间(pwdUpdateDate)”，不提醒 |
| 计算出的剩余天数 `days < 1` | 统一按 `1` 天显示，避免出现“0 天/负数天”文案 |
| 表单校验不通过 | toast“请检查输入信息”，不发起请求 |
| 改密接口失败 | toast 具体错误信息，弹窗关闭可重试 |

---

## 10. 涉及文件与职责

| 文件 | 职责 |
| --- | --- |
| `src/modules/appHome/index.js` | 首页组件：`mounted` 触发检查，承接检查结果数据，打开改密组件 |
| `src/modules/appHome/index.html` | 首页模板：过期提醒弹窗 + `<ChangePassword>` 组件挂载 |
| `src/modules/appHome/changePassword/index.js` | 改密弹窗组件：表单校验、提交改密 |
| `src/modules/appHome/changePassword/index.html` | 改密弹窗模板 |
| `src/services/loginService.js` | 核心判断 `checkIfNeedUpdatePassword`、改密接口 `updatePasswordV2` |
| `src/services/pipeService.js` | 字典接口 `getCommonsDict` |
| `src/controllers/loginController.js` | 控制层转发 `updatePasswordV2` |
| `src/services/serviceHelper.js` | 加密请求 `requestByGetAndEncrypt` |

---

## 11. 如何改为“过期前 7 天提醒”

只需修改 `src/services/loginService.js` 中 `checkIfNeedUpdatePassword` 里的提醒阈值：

```js
// 当前：硬编码 180
const pwdExpirationReminderDayItem = { value: '180' };

// 改为 7，或恢复从字典项“即将过期提示时间”读取：
const pwdExpirationReminderDayItem = res.find(item => item.text === '即将过期提示时间') || { value: '7' };
```

即可实现“密码到期前 7 天内进入首页时弹出提醒”。

---

## 12. 一句话总结

这个模块的本质是：**首页进入时先根据后端配置和密码更新时间计算是否进入预警区间，命中后弹出提醒，并引导用户进入独立改密流程，形成密码生命周期的完整闭环。**
