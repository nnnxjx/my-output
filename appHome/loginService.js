const Notification = require('element-ui');
const eventHelper = require('utils/eventHelper');


define(['./serviceHelper', '../config', 'services/pipeService'], function (serviceHelper, config, pipeService) {
    return {
        login: function (data, cb, errorCb) {
            serviceHelper.postJson(serviceHelper.getPath('login'), data, (result) => {//原来的
                cb(result);
            }, errorCb)
        },
        getUserRole: function (token, cb, errorCb) {
            $.get(serviceHelper.getPath('userRole'), function (result) {
                if (!!result) {
                    var resultObj = JSON.parse(result);
                    if (resultObj.state == 1) {
                        cb(resultObj.data.result);
                    }
                } else {
                    errorCb();
                }
            });
        },
        getCurrentUserInfo: function (cb) {//获取账号信息
            let param = {
                id: 'getCurrentUserInfo',
            };
            serviceHelper.getResult(param, (result) => {
                cb(result);
            })
        },
        setTokenFactoryUserId: function (data, cb) {
            let param = {
                id: 'setTokenFactoryUserId',
                parameter: data
            };
            serviceHelper.getResult(param, (result) => {
                cb(result);
            })
        },
        getValidateCode: function (param, cb, error) {
            var parameter = {
                id: 'getValidateCode',
                parameter: param
            }
            serviceHelper.get(serviceHelper.getPath(parameter), function (result) {
                if (!!result.success) {
                    cb(result)
                    return;
                }else{
                    error(result)
                }

            });
        },
        //开始定时刷新token
        //原则上每次进入页面要且只能执行一次此方法
        startRefreshTokenInterval: function (cb) {
            // setInterval(function () {
            //     //refreshToken
            //     //间隔一段时间（目前暂时2分钟更新一次）往后台更新一下token，保证token在后台不过期
            //     //加上随机数，ie下没有随机数会被使用缓存
            //     $.get(serviceHelper.getPath('refreshToken'), {r: Math.random()}, function (result) {
            //         if (!!result) {
            //             if (!!result.success) {
            //                 console.log('刷新Token成功');
            //             }
            //         }
            //         else {
            //             console.log('刷新Token失败');
            //         }
            //     });
            // }, 1200);
            let param = {
                id: 'refreshToken'
            };
            setInterval(function () {
                //refreshToken
                //间隔一段时间（目前暂时2分钟更新一次）往后台更新一下token，保证token在后台不过期
                //加上随机数，ie下没有随机数会被使用缓存
                serviceHelper.getResult(param, (result) => {
                    // console.log(result)
                    cb(result);
                })
            }, 60000);
        },
        heartBeat: function (success, error) {
            serviceHelper.get(serviceHelper.getPath('refreshToken'), success, error, 8000);
        },
        getUserMenu: function (cb) {
            serviceHelper.getResult({
                id: 'userMenu',
                parameter: {
                    classify: 'app'
                }
            }, (result) => {
                cb(result);
            })
        },
        
        getToDoCount: function (cb) {
            var parameter = {
                id: 'getToDoCount',
               
            }
            serviceHelper.get(serviceHelper.getPath(parameter), function (result) {
                if (!!result.success) {
                    cb(result)
                    return;
                }else{
                    error(result)
                }

            });
        },
        getCurrentVersion: function (cb) {
            var refreshTime = new Date();
            $.get(config.versionURL + 'version.json?' + refreshTime.getTime(), function (result) {
                var needUpdate = result == config.version ? false : true;
                cb(needUpdate);
            });
        },
        getAllowMinVersion: function (data, cb) {
            let param = {
                id: 'getAllowMinVersion',
                parameter: data
            };
            serviceHelper.getResult(param, (result) => {
                cb(result);
            })
        },
        registerUser: function (form, success, fail) {
            var parameter = {
                id: 'registerUser',
                parameter: form
            };
            window.$Indicator.open('加载中');
            serviceHelper.getJson(
                serviceHelper.getPath(parameter),
                {},
                result => {
                    window.$Indicator.close();
                    success(result);
                },
                err => {
                    window.$Indicator.close();
                    if (fail && typeof fail === 'function') fail(err);
                }
            );
        },
        checkLoginName: function (loginName, success, fail) {
            var parameter = {
                id: 'checkLoginName',
                parameter: {
                    name: loginName
                }
            };
            window.$Indicator.open('加载中');
            serviceHelper.getJson(
                serviceHelper.getPath(parameter),
                {},
                result => {
                    window.$Indicator.close();
                    success(result);
                },
                err => {
                    window.$Indicator.close();
                    if (fail && typeof fail === 'function') fail(err);
                }
            );
        },
        getOrgTree: function (cb) {
            serviceHelper.get(serviceHelper.getPath('getOrgTree'), function (result) {
                if (!!result) {
                    if (!!result.success) {
                        cb(result);
                        return
                    } else {
                        cb({success: false})
                    }
                } else {
                    cb({success: false});
                }
            });
        }, getDutyTree: function (cb) {
            serviceHelper.get(serviceHelper.getPath('getDutyTree'), function (result) {
                if (!!result) {
                    if (!!result.success) {
                        cb(result);
                        return
                    } else {
                        cb({success: false})
                    }
                } else {
                    cb({success: false});
                }
            });
        },
        checkPhone: function (phoneNum, cb) {
            var parameter = {
                id: 'checkPhone',
                parameter: {
                    phone: phoneNum
                }
            };
            serviceHelper.get(serviceHelper.getPath(parameter), function (result) {
                if (!!result) {
                    if (!!result.success) {
                        cb(result);
                        return
                    } else {
                        cb({success: false})
                    }
                } else {
                    cb({success: false});
                }
            });
        },
        //获取ios版本信息
        getIosVersionInfo: function (data, cb) {
            let param = {
                id: 'getIosVersionInfo',
                parameter: data
            };
            serviceHelper.getResult(
                param,
                cb
            );
        },
        updatePassword: function (form, cb) {
            serviceHelper.postJson(serviceHelper.getPath('updatePassword'), {
                oldPassword: form.password,
                newPassword: form.newPassword
            }, function () {
                cb(true);
            }, function () {
                cb(false);
            });
        },
        // 重置密码发送短信
        sendSmsCode: (param, cb, fail) => {
            serviceHelper.getJson(serviceHelper.getPath('sendSmsCode'), param, result => {
                cb(result);
            }, err => {
                fail && fail(err)
            })
        },
        // 重置密码
        resetPwd: (param, cb, fail) => {
            serviceHelper.postJson(serviceHelper.getPath('resetPwd'), param, result => {
                cb(result);
            }, err => {
                fail && fail(err)
            })
        },
        getAllParentOrgByUserId: function (parame, cb) {
            var parameter = {
                id: 'getAllParentOrgByUserId',
                parameter:parame
            };
            serviceHelper.get(serviceHelper.getPath(parameter), function (result) {
                if (!!result) {
                    if (!!result.success) {
                        cb(result);
                        return
                    } else {
                        cb({success: false})
                    }
                } else {
                    cb({success: false});
                }
            });
        },

        //检查是否要修改密码 返回true需要修改密码 false不需要修改密码
        checkIfNeedUpdatePassword(userName, password, pwdUpdateDate, systemDate,changePassword) {
            if (!pwdUpdateDate || !systemDate) {
                Notification.warning({
                    title: '提示',
                    message: '密码有效期校验失败：后台接口未返回pwdUpdateDate或systemDate字段',
                });
                return false;
            }
            pipeService.getCommonsDict({
                needCache: true,
                groupDirt: 'pwd_refresh_day',
            }, (res) => {
                // console.log(res);
                if (!res || !res.length) {
                    Notification.warning({
                        title: '提示',
                        message: '密码有效期校验失败：未配置密码有效期字典pwd_refresh_day',
                    });
                    return false;
                }
                const timeGap = (new Date(systemDate).getTime() - new Date(pwdUpdateDate).getTime()) / 1000 / 60 / 60 / 24;
                // console.log(timeGap);
                if (timeGap < 0) {
                    Notification.warning({
                        title: '提示',
                        message: '密码有效期校验失败：系统时间(systemDate)早于密码更新时间(pwdUpdateDate)',
                    });
                    return false;
                }
                const pwdExpirationDayItem = res.find(item => item.text === '密码过期修改时间');
                const pwdExpirationReminderDayItem = res.find(item => item.text === '即将过期提示时间');
                // const pwdExpirationReminderDayItem ={value:'175'};
                if (pwdExpirationDayItem
                    &&
                    pwdExpirationReminderDayItem
                    && timeGap < Number(pwdExpirationDayItem.value)
                    && timeGap > (Number(pwdExpirationDayItem.value) - Number(pwdExpirationReminderDayItem.value))
                ) {
                    let days = parseInt(Number(pwdExpirationDayItem.value) - timeGap);
                    console.log(days);
                    if (days < 1) {
                        days = 1;
                    }
                    changePassword.days=days;
                    changePassword.showDialog=true;
                    // Notification.warning({
                    //     title: '提示',
                    //     message: `
                    //         <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:280px;">
                    //             <span>密码还有${days}天过期，请及时修改密码</span>
                    //             <button
                    //                 type="button"
                    //                 style="
                    //                     border:0;
                    //                     background:#409EFF;
                    //                     color:#fff;
                    //                     padding:6px 14px;
                    //                     border-radius:4px;
                    //                     cursor:pointer;
                    //                     font-size:12px;
                    //                     line-height:1;
                    //                     white-space:nowrap;
                    //                 "
                    //                 onclick="window.dispatchEvent(new CustomEvent('update-password-from-reminder', { detail: { loginName: '${userName}', password: '${password}', isForce: false } }))"
                    //             >
                    //                 修改密码
                    //             </button>
                    //         </div>
                    //     `,
                    //     duration: 0,
                    //     dangerouslyUseHTMLString: true,
                    // });
                    return true;
                }
                return false;
            });
        },
        updatePasswordV2: function (form, cb, errorCb) {
            serviceHelper.requestByGetAndEncrypt('modifyPassword', form, cb, errorCb);
        },
    }
});
