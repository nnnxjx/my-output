const template = require('./index.html');
const appIndexController = require('controllers/appIndexController');
const userController = require('controllers/userController');
const moment = require("moment");
const socketHelper = require('utils/socketHelper');
const eventHelper = require('utils/eventHelper');
var serviceHelper = require("services/serviceHelper");
var permissionModel = require('controllers/model/permissionModel');
var loginCtrl = require('controllers/loginController');
var permissionCtrl = require('controllers/permissionController');
var userModel = require('controllers/model/userModel.js')
var safeTydisclosureService = require("services/safeTydisclosureService");
require("./index.scss");
const ChangePassword = require("./changePassword/index.js");
const loginService = require("services/loginService");

// 定义组件
let self;
const comm = Vue.extend({
    template: template,
    data: function () {
        return {
            changePassword:{
                showDialog: false,//是否显示提示弹窗
            days:0,//密码还有多少天过期,
            showChangePassword: false,//是否显示修改密码弹窗
            },//处理密码修改相关数据
            hasAgree: false,//是否同意协议
            userVersion: '',//用户的版本，决定是否弹出法律声明
            bannerImg: './img/appHome/banner1.jpg',//banner图片
            gzLogo: './img/appHome/logo.png',//banner下面的logo
            helpImg: './img/appHome/help.png',//帮助图片
            //通知栏内容
            noticeMsg: [],
            menus: [],
            //菜单内容
            /*menusData: [
                {
                    text: '管网标准库',
                    color: 'orange',
                    id: 'gwdt',
                    link: 'appIndex',
                    icon: 'icon-guanwang',
                    img: './img/appHome/c1.png'
                },
                {
                    text: '管网运行图',
                    // color:'thinGreen',
                    color: 'brown',
                    link: 'appIndex',
                    id: 'gwyxt',
                    icon: 'icon-xunjianjilu',
                    img: './img/appHome/c3.png'
                },
                {
                    text: '接收统计',
                    color: 'orange',
                    permission: 'pipe-handover',
                    id: 'psjb',
                    link: 'appStatistics',
                    icon: 'icon-guanwangyali',
                    img: './img/appHome/c5.png'
                },
                {
                    text: '接收日志',
                    permission: 'pipe-handover',
                    color: 'green',
                    id: 'gjjl',
                    link: 'appReceiveLog',
                    icon: 'icon-lishiguijijiluhehuifang',
                    img: './img/appHome/c4.png',
                },
                {
                    text: '监测检测',
                    color: 'blue',
                    // color: 'brown',
                    id: 'zxjc',
                    icon: 'icon-zaixianjiance',
                    link: 'appIndex',
                    img: './img/appHome/c5.png'
                },
                {
                    text: '设备列表',
                    color: 'blue',
                    // color: 'brown',
                    id: 'sblb',
                    icon: 'icon-wenjian',
                    link: 'onlineMonitor',
                    img: './img/appHome/c1.png'
                },
                {
                    text: '监测设备工单',
                    color: 'blue',
                    id: 'workOrderList',
                    icon: 'icon-zaixianjiance',
                    link: 'workOrderList',
                    img: './img/appHome/c5.png'
                },
                {
                    text: '管网接收',
                    color: 'thinGreen',
                    id: 'gwjs',
                    icon: 'icon-guanwangwenti',
                    img: './img/appHome/c1.png',
                    link: 'appIndex',
                    // link: 'appProblemGW',
                    // img: './img/appHome/c6.png'
                },
                {
                    text: '运行图审查',
                    color: 'green',
                    id: 'sjsc',
                    icon: 'icon-shujushenpi',
                    link: 'appReviewLog',
                    // img:'./img/appHome/c2.png'
                    img: './img/appHome/c5.png'
                },
                {
                    text: '运行图日志',
                    color: 'blue',
                    id: 'ztxx',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'appWorkLog',
                },
                {
                    text: '运营统计',
                    color: 'blue',
                    id: 'yytj',
                    icon: 'icon-shujushenpi',
                    img: './img/appHome/c1.png',
                    // img: './img/appHome/c6.png',
                    link: 'appMotionStatistics',
                },
                {
                    text: '污水系统监测',
                    color: 'blue',
                    id: 'wsxtjc',
                    icon: '',
                    img: './img/appHome/wsxtjc.png',
                    link: 'sewageSystemMonitoring',
                },
            ]*/


            menusData:[
                {
                    text: '排水GIS',
                    // color:'thinGreen',
                    color: 'brown',
                    link: 'appNewIndex',
                    id: 'gwyxt',
                    icon: 'icon-guanwang',
                    img: './img/appHome/c3.png',
                    backgroundColor: '#6fc9f1',
                },
                {
                    text: '物联感知',
                    color: 'blue',
                    id: 'zxjc',
                    icon: 'icon-zaixianjiance',
                    link: 'onlineMonitor',
                    backgroundColor: '#092897',
                    img: './img/appHome/c5.png'
                },{
                    text: '管网养护',
                    color: '#00C6F9',
                    id: 'gwxj',
                    icon: 'icon-guanwangwenti',
                    img: './img/appHome/c2.png',
                    link: 'pipeInspection',
                    backgroundColor: '#5ad898',
                }, {
                  text: '排水小区',
                  color: '#00C6F9',
                  id: 'unitJudge',
                  useClassify: true, // 使用组菜单
                  icon: 'icon-jiancejiance',
                  img: './img/appHome/c2.png',
                  link: 'drainageUnit',
                  backgroundColor: '#5ad898',
                },{
                    text: '管网问题图',
                    color: '#00C6F9',
                    id: 'gwwtt',
                    img: './img/appHome/gwwtt.png',
                    link: 'appPipeProblemSpecial',
                    showImg:true
                },{
                    text: '应急调度',
                    color: 'blue',
                    id: 'yjdd',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'emergencyCommand',
                },
                {
                    text: '泵闸养护',
                    color: 'blue',
                    id: 'deviceStationInspection',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'deviceStationInspection',
                },
                {
                    text: '泵站巡检',
                    color: '#00C6F9',
                    id: 'bzxj',
                    icon: 'icon-guanwangwenti',
                    img: './img/appHome/bengzha.png',
                    link: 'appWorkOrderPump',
                    backgroundColor: '#3c50a1',
                    showImg:true
                },
                {
                    text: '排口管理',
                    color: '#00C6F9',
                    id: 'pkgl',
                    icon: 'icon-guanwangwenti',
                    img: './img/appHome/c2.png',
                    link: 'appWorkOrderSpout',
                    backgroundColor: '#ffd1d1',
                },

                // {
                //     text: '农污巡检',
                //     color: '#00C6F9',
                //     id: 'farmPollutionInspection',
                //     icon: 'icon-guanwangwenti',
                //     img: './img/appHome/c2.png',
                //     link: 'appFarmPollutionInspection',
                //     backgroundColor: '#5ad898',
                // },
                {
                    text: '农污管网',
                    link: 'appAgriculture',
                    color: 'brown',
                    id: 'agriculturePipeThematic',
                    icon: '',
                    img: './img/appHome/nwkh.png',
                    showImg:true
                },
                {
                    text: '地陷风险',
                    color: 'blue',
                    id: 'earthRisk',
                    icon: 'icon-shujushenpi',
                    img: './img/appHome/earthRisk.png',
                    link: 'appNewIndex',
                    backgroundColor: 'blue',
                },
                {
                    text: '洗管洗井',
                    color: 'blue',
                    id: 'cleanPipe',
                    icon: 'icon-xiguanxijing',
                    img: './img/appHome/cleanPipe.png',
                    link: 'cleanPipeBox',
                    showImg: true
                },
                {
                    text: '工地监管',
                    color: 'green',
                    id: 'siteSupervision',
                    icon: 'icon-zaijiangongdianjian',
                    img: './img/appHome/c4.png',
                    link: 'appNewIndex',
                    backgroundColor: '#409eff',
                },
                {
                    text: '井盖维修',
                    color: 'blue',
                    id: 'wellLidMaintain',
                    icon: '',
                    img: './img/appHome/wellLidMaintain.png',
                    link: 'wellLidMaintain',
                    showImg: true
                },
                {
                    text: '生产项目',
                    color: '#00C6F9',
                    id: 'wdgz',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'sdMyJob',
                    showImg:true
                },
                {
                    text: '施工方',
                    color: '#00C6F9',
                    id: 'wdgzsgdw',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'sdMyJobConstructionUnit',
                    showImg:true
                }, {
                    text: '安全管理',
                    color: '#00C6F9',
                    id: 'aqgl',
                    useClassify: true,
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'smMyJob',
                    showImg:true
                },
                {
                    text: '客服投诉',
                    color: '#00C6F9',
                    id: 'complaintProblemManage',
                    icon: 'icon-zhuantixinxi',
                    img: './img/appHome/c4.png',
                    link: 'complaintProblemManage',
                    showImg:true
                },
                {
                    text: '调度工单',
                    color: 'blue',
                    id: 'dispatchWork',
                    icon: 'icon-zaixianjiance',
                    link: 'dispatchWork',
                    backgroundColor: '#092897',
                    img: './img/appHome/c5.png',
                    bgClass: 'bg-blue',
                    bgIcon: './img/appHome/work.png',
                },
                {
                    text: '安防管理',
                    color: 'blue',
                    id: 'securityManagement',
                    icon: 'icon-zaixianjiance',
                    link: 'securityManagement',
                    backgroundColor: '#092897',
                    img: './img/appHome/c5.png',
                    bgClass: 'bg-blue',
                    bgIcon: './img/appHome/securityManagement.png',
                },

            ],

            Allread: false,//是否阅读安全交底内容
            disabBut: false, //确认阅读安全交底内容按钮是否可编辑
            safetyVisible: false, //安全交底显隐
            workGuide: '',//安全交底内容
            isReadTime: false,//是否满足阅读时间
            readTime: 10,//阅读倒计时
            setReadTime: {},//阅读倒计时定时器
            safeMenu: {}, // 安全交底使用菜单
        }
    },
    components: {
        ChangePassword,
      },
    created: function () {
        eventHelper.emit('loading-start');
        this.getUserMenu();
        // this.agreement()
        eventHelper.on('login', () => {
            this.getUserMenu();
        })
    },
    methods: {

        
        /**
         * 打开扫码组件
         *
         */
        scanQRCode() {
            this.$router.push({
                name: 'QRCode'
            });
        },
        goBack(){
            this.$MessageBox.confirm('是否退出app?').then(action => {
                this.$router.push({
                    path: '/appLogin',
                });
            });

        },
        /**
         * 打开当前菜单详情
         * @param menu
         */
        openMenuDetail(menu) {
            // if (!!menu.permission) {
            // if (!permissionModel.checkHasPermission(menu.permission)) {
            if (!menu.power) {
                this.$dialog.toast({
                    mes: '无使用权限',
                    timeout: 1000
                });
                return;
            }

            // 安全交底的接口不行了，暂时屏蔽 - 2024-02-01
            // if (menu.id === 'gwxj') {
            //     this.safeMenu = menu;
            //     this.getOneSafeTydisclosure();
            // } else {
            //     this.getClickMenu(menu);
            // }
            this.getClickMenu(menu);

            // }
        },
        // 菜单模块点击
        getClickMenu(menu) {
            if (!!menu.link) {
                let location = {
                    name: '',
                    params: {
                        menuId:menu.id
                    },
                    query: {
                        menuId:menu.id
                    }
                };
                location.name = menu.link;
                // 若有子权限路由，则跳转页面后传参
                if (!!menu.childMenus) location.params.childMenus = menu.childMenus;
                // 若为监测设备工单，传递from参数，用于控制页面tab
                if (menu.link === 'workOrderList') location.params.resetTab = true;
                this.$router.push(location);
                permissionModel.setCurrentModule(menu);
                // 保存用户菜单的点击日志
                const loginName = window.localStorage.getItem('cescUserName');
                let devicePlatform = '';
                try {
                    devicePlatform = device.platform;
                } catch (err) {
                    // 若报错，则意味着是未安装cordova-plugin-device导致
                    // 默认执行安卓逻辑
                    devicePlatform = 'Android';
                }
                const appVersion = window.localStorage.getItem("appVersion");
                userController.saveSystemLog(
                    {
                        type: 3,
                        funName: menu.text,
                        loginName,
                        clientVersion: `${devicePlatform}-${appVersion}`,
                    },
                    res => {
                    },
                    err => {
                    }
                );
            } else {
                this.$dialog.toast({
                    mes: '功能暂未开放!',
                    timeout: 1000
                });
                return;
            }
        },
        //获取对应权限的菜单
        getUserMenu: function () {
            var self = this;
            loginCtrl.getUserMenu(function (data) {
                let menusData;
                if (RUNNING_ENV === 'dev') {
                    menusData = self.menusData;
                } else {
                    let devicePlatform = '';
                    try {
                        devicePlatform = device.platform;
                    } catch (err) {
                        // 若报错，则意味着是未安装cordova-plugin-device导致
                        // 默认执行安卓逻辑
                        devicePlatform = 'Android';
                    }
                    if (devicePlatform === 'iOS') {
                        menusData = self.menusData.filter(item => menus.indexOf(item.text) != -1);
                    } else {
                        menusData = self.menusData;
                    }
                }
                var arr = [];
                menusData.forEach(function (item) {
                    data.forEach(function (obj) {
                        if(item.useClassify) {
                            if(obj.classify == item.id) {
                                item.power = true;
                                arr.push(item);
                            }
                        }
                        // 因安全生产为组菜单，无法通过funUrl的方式进行匹配
                        // 因此通过title来匹配
                        else if (obj.funUrl == item.id || obj.title === item.text) {
                            item.power = true;
                            arr.push(item);
                        }
                    });
                    if (!item.power) {
                        self.menus.push(item);
                    }
                }.bind(this));
                self.menus = arr;
                // 所有帐号都有巡检上报的权限
                // let isPipeInspection = this.menus.findIndex(item=>{
                //     return item.text=='河道巡检'
                // })
                // if(isPipeInspection<0) {
                //     this.menus.push({
                //         text: '河道巡检',
                //         color: 'thinGreen',
                //         id: 'gwxj',
                //         icon: 'icon-guanwangwenti',
                //         img: './img/appHome/c1.png',
                //         link: 'appPipeInspection',
                //         power: true,
                //     })
                // }
                if (arr.length == 1) {
                    this.openMenuDetail(arr[0]);//当只有一个菜单的时候默认打开
                }
                else {
                    eventHelper.emit('loading-end');
                }
                eventHelper.on('setCurrentMenu', (id) => {
                    const menu = arr.find(item => item.id === id)
                    if(menu) {
                        permissionModel.setCurrentModule(menu);
                    }
                })
                permissionCtrl.init(data);
            }.bind(this), function (error) {
                console.log(error);
                eventHelper.emit('loading-end');
            }, true)
        },
        /**
         * 跳转下一个页面
         * @param menuItem
         * @param data
         */
        goNext(menuItem, data) {
            this.$router.push('/helpDoc')
        },

        /**** 安全交底-start ****/
        /**
         * 获取安全交底信息
         */
         getOneSafeTydisclosure: function () {
            //获取安全交底信息
            safeTydisclosureService.getOneSafeTydisclosure({}, (result) => {
                // 没有班组不显示安全交底
                if (result.safeTydisclosureList.length > 0) {
                    this.safetyVisible = true
                    console.log(this.safetyVisible)
                    for (let i = 0; i < result.safeTydisclosureList.length; i++) {
                        //多个安全交底用虚线分割
                        if (i > 0) {
                            this.workGuide += '</br><hr style= "border:1px dashed #000" /></br>'
                        }
                        //安全交底标题
                        let resultTitle = result.department[result.safeTydisclosureList[i].department - 1].children.filter(item => {
                            return item.value == result.safeTydisclosureList[i].teamUnit
                        })
                        this.workGuide += '<h3>' + result.department[result.safeTydisclosureList[i].department - 1].text + '--' + resultTitle[0].text + '</h3>'
                        //安全交底内容
                        this.workGuide += result.safeTydisclosureList[i].content.replace(/\n/g, '_@').replace(/\r/g, '_#');
                    }
                    this.workGuide = this.workGuide.replace(/_#_@/g, '<br/>');//IE7-8
                    this.workGuide = this.workGuide.replace(/_@/g, '<br/>');//IE9、FF、chrome
                    //内容是否滚动
                    if ($('.safetyContent')[0].scrollHeight > ($('.safetyContent')[0].innerHeight || $('.safetyContent')[0].clientHeight)) {
                        window.addEventListener('scroll', this.handleScroll, true);
                    } else {
                        this.disabBut = true;
                    }
                    this.setReadTime = setInterval(() => {
                        this.readTime--;
                        if (this.readTime == 0) {
                            clearInterval(this.setReadTime);
                        }
                    }, 1000)
                    setTimeout(() => {
                        this.isReadTime = true;
                        if (this.disabBut && this.isReadTime) {
                            this.Allread = true;
                        }
                    }, 10000)
                } else {
                    this.getClickMenu(this.safeMenu);
                }
            }, err => {
                this.$toast({
                    message: '获取安全交底失败：' + err
                });
            });
        },
        // 判断是否阅读完安全交底内容
        handleScroll: function () {
            let scrollTop = $('.safetyContent').scrollTop();//滚动高度
            let height = $('.safetyContent').height();//可见高度
            let scrollHeight = $('.safetyContent').get(0).scrollHeight;//内容高度
            if (scrollTop > height) {
                this.disabBut = true;
                if (this.disabBut && this.isReadTime) {
                    this.Allread = true;
                }
            }
            if (scrollHeight - height - scrollTop < 100) {
                // this.Allread = true;
                this.disabBut = true;
                if (this.disabBut && this.isReadTime) {
                    this.Allread = true;
                }
            }
        },
        // 进入电子签名页面
        activeSignature: function () {
            eventHelper.emit('activeSignature');
            this.safetyVisible = false;
            window.removeEventListener('scroll', this.handleScroll, true);
        },
        // 已阅读安全交底上传后台记录
        submitConfirm: function (img) {
            // 阅读完安全交底获取考勤状态
            eventHelper.emit('loading-start');
            safeTydisclosureService.addSafeTydisclosureLog({}, result => {
                let filename = new Date().getTime();
                let param = {
                    id: 'gwxjBatchUploadFile',
                    bizType: 'safeTydisclosure',
                    bizId: result.id,
                    imageName: filename,
                    dataurl: 'image/png,'+img
                }
                serviceHelper.uploadFile(param, res => {
                    this.$toast({
                        message: '提交签名成功'
                    });
                })
                this.getClickMenu(this.safeMenu);
                eventHelper.emit('loading-end');
            }, err => {
                this.$toast({
                    message: '提交签名失败：' + err
                });
            });
        },
        /**** 安全交底-end ****/

        showChangePassword(){
            this.$refs.changePassword.show();
        }
    },
    filters: {},
    activated: function () {
        eventHelper.emit('showCheckPoint', false);//把打卡关闭掉
    },
    mounted: function () {
        const cescUserName = window.localStorage.getItem('cescUserName');
        const password = window.localStorage.getItem('cescPassword');
        const userInfo=JSON.parse(window.localStorage.getItem('userInfo'));
        const pwdUpdateDate = userInfo.pwdUpdateDate;
        const systemDate = userInfo.systemDate;
        // if (cordova.plugins.amapLocation) {
        //     cordova.plugins.amapLocation.init({
        //       text: "神龙正在运行中", // 文字说明
        //       icon: "icon", // 默认填icon即可
        //     });
        //   }
        // try {
        //     //配置后台通知栏显示信息
        //     cordova.plugins.backgroundMode.setDefaults({
        //         title:   '番禺管养通',//背景任务的标题
        //         text:    '番禺管养通正在运行...',//后台任务说明
        //         bigText: false,
        //         resume:  true,//应用程序将在点击通知时进入前台
        //         silent:  false,//如果true插件不会显示通知
        //         hidden:  true,//设置为false将使通知在锁屏上可见
        //         color:   undefined,//设置通知圈的背景色
        //         icon:    'icon'  //从平台查找系统图标
        //     });
        //     // 如果应用程序移到后台，模式将变为活动状态
        //     cordova.plugins.backgroundMode.enable();
        //     cordova.plugins.backgroundMode.wakeUp();
        //     //确保app在后台模式下仍然正常工作（该方法会增加资源和功耗）
        //     cordova.plugins.backgroundMode.on('activate', function() {
        //         cordova.plugins.backgroundMode.disableWebViewOptimizations();
        //     });
        // } catch (error) {
        //     console.log('run on mobile')
        // }
        // 获取用户角色版本信息
        serviceHelper.getJson(
            serviceHelper.getPath('getCurUserVersionInfoDetail'),
            {cescUserName},
            result => {
                if (!!result && !!result.versionInfo && !!result.versionDetail) {
                    this.userVersion = result.versionInfo
                    // this.vaildUserVersion(this.userVersion) //判断是否弹出法律声明的框
                    var noticeArr = [];
                    var updateDetail = result.versionDetail;
                    var updateTime = moment(result.createTime).format('MM月DD日');
                    if (updateDetail.indexOf(';') > 0) {
                        var detailArr = updateDetail.split(';');
                        var tempArr = [];
                        detailArr.forEach(function (detail) {
                            if (tempArr.length < 2) {
                                tempArr.push({
                                    time: updateTime,
                                    title: detail
                                })
                            } else {
                                noticeArr.push({
                                    children: tempArr.slice(0)
                                });
                                tempArr.splice(0);
                                tempArr.push({
                                    time: updateTime,
                                    title: detail
                                })
                            }
                        });
                        if (tempArr.length > 0) {
                            noticeArr.push({
                                children: tempArr
                            });
                        }
                    } else {
                        noticeArr.push({
                            children: [
                                {
                                    time: updateTime,
                                    title: result.versionDetail
                                }
                            ]
                        })
                    }
                    this.noticeMsg = noticeArr;
                }
            });

            //提交电子签名图片
        eventHelper.on('returnSignaturePictures', (img) => {
            this.submitConfirm(img)
        });


        loginService.checkIfNeedUpdatePassword(cescUserName, password, pwdUpdateDate, systemDate,this.changePassword);
    },

});
module.exports = comm;
