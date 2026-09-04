const template = require('./content.html');
require('./index.scss')
const api = require('@IN/waterRainCollection/services');
const serviceHelper = require('@IN/services/serviceHelper');
const common = require('@IN/utils/common');

const imgUrls = {
    'pic_icon': require('@IN/images/pic_icon.png'),
    'camera_icon': require('@IN/images/camera_icon.png'),
}

const comm = Vue.extend({
    template: template,
    data() {
        return {
            imgUrls: imgUrls,
            loading: false,
            submitLoading: false,
            isDetail: false,
            orderInfo: {},
            checkPointData: [],
            checkPointsForm: {},
            isOpenUploadPic: false,
            uploadPicItem: {},
            outsidePersonNum:'',//昨日外来人员数量,
            constructionFile:[{
                bizType: 'dayInspection_constructionFile',//后台保存的bizType
                limit:9,
                uploadImgs: [],//保存图片的数组
                imgIds: [],//上传图片成功后回调的图片id数组
            }],
            haveConstruction:false,//有无涉库施工
        }
    },
    activated() {
        this.init();
    },
    methods: {
        initConstructionFile(res) {
            this.constructionFile[0].imgIds = res.constructionFile.map(item => item.id) || [];
            this.constructionFile[0].uploadImgs = res.constructionFile.map(item => {
                return { url: serviceHelper.getGwxjPicUrl(item.id) }
            });
        },
        goBack() {
            this.$router.go(-1);
        },
        formatNaturalNumber(value) {
            return String(value || '').replace(/[^\d]/g, '');
        },
        blockNumberInputKeys(e) {
            const blockedKeys = ['e', 'E', '+', '-', '.', 'ArrowUp', 'ArrowDown'];
            if (blockedKeys.includes(e.key)) {
                e.preventDefault();
            }
        },
        async init() {
            let { orderInfo, isDetail } = this.$route.query;
            orderInfo = JSON.parse(orderInfo);
            this.isDetail = isDetail == 1;
            await this.getClockPointsByReservoirId(orderInfo.reservoirId);
            this.getDayInspectionDetail(orderInfo.id);
        },
        // 获取打卡点数据
        getClockPointsByReservoirId(reservoirId) {
            return new Promise((resolve, reject) => {
                this.loading = true;
                api.getClockPointsByReservoirId({id: reservoirId}).then((res) => {
                    this.checkPointData = res || [];
                    resolve(this.checkPointData);
                }).catch((err) => {
                    console.log('获取打卡点数据失败', err)
                    const msg = common.getErrMsg('获取打卡点数据失败', err);
                    this.$message.error(msg);
                    reject(err);
                }).finally(() => {
                    this.loading = false;
                });
            })
        },
        initCheckPointForm(checkPointData) {
            let detailContents = this.orderInfo.contents || [];
            let checkPointsForm = {};
            checkPointData.forEach(item => {
                const curContentItem = detailContents.find(contentItem => contentItem.clockPointId === item.id);
                let building = item.checPointName.split('-')[1];
                let newItem = {
                    id: 0,
                    clockPointId: item.id,
                    clockPointName: item.checPointName,
                    abnormal: true,
                    remark: '',
                    picList: [
                        {
                            bizType: 'dayInspectionContentPic',//后台保存的bizType
                            limit: this.isDetail ? 0 : 9,
                            uploadImgs: [],//保存图片的数组
                            imgIds: [],//上传图片成功后回调的图片id数组
                            require: true,
                        }
                    ],
                }
                if (curContentItem) {
                    newItem.id = curContentItem.id;
                    newItem.abnormal = curContentItem.abnormal !== '巡查异常';
                    newItem.remark = curContentItem.remark || '';
                    newItem.picList[0].imgIds = curContentItem.dayInspectionContentPic.map(pic => pic.id);
                    newItem.picList[0].uploadImgs = curContentItem.dayInspectionContentPic.map(pic =>{
                        return { url: serviceHelper.getGwxjPicUrl(pic.id) }
                    })
                }
                if (building) {
                    if (!checkPointsForm[building]) {
                        checkPointsForm[building] = [newItem];
                    } else {
                        checkPointsForm[building].push(newItem);
                    }
                }
            });
            this.checkPointsForm = checkPointsForm;
            console.log('checkPointsForm', this.checkPointsForm);
        },
        // 获取日巡检详情
        getDayInspectionDetail(id) {
            return new Promise((resolve, reject) => {
                this.loading = true;
                api.getDayInspectionDetail({id: id}).then((res) => {
                    this.orderInfo = res;
                    this.outsidePersonNum = res.outsidePersonNum || '';
                    this.haveConstruction = res.haveConstruction || false;
                    this.initConstructionFile(res);
                    // console.log('res', res);
                    // console.log('this.outsidePersonNum', this.outsidePersonNum);
                    // console.log('this.haveConstruction', this.haveConstruction);
                    // console.log('this.constructionFile', this.constructionFile);
                    if (this.isDetail) { // 如果是详情页，则需要根据详情内容来初始化打卡点表单
                        let checkPointData = res.contents || [];
                        checkPointData.forEach(item => {
                            item.checPointName = item.clockPointName;
                            item.id = item.clockPointId;
                        });
                        this.initCheckPointForm(checkPointData);
                    } else {
                        this.initCheckPointForm(this.checkPointData);
                    }
                    resolve(res);
                }).catch((err) => {
                    this.loading = false;
                    const msg = common.getErrMsg('获取日巡检详情失败', err);
                    this.$message.error(msg);
                    reject(msg);
                });
            });
        },

        openUploadPic(item) {
            this.uploadPicItem = item;
            this.isOpenUploadPic = true;
        },
        closeUploadPic() {
            this.isOpenUploadPic = false;
        },
        uploadPicCallback(type) {
            console.log('uploadPicCallback', this.uploadPicItem);
            eventHelper.emit('loading-start');
            let params = {
                id: this.orderInfo.id,
                contents: [
                    Object.assign({}, this.uploadPicItem, {
                        abnormal: this.uploadPicItem.abnormal ? '巡查正常' : '巡查异常',
                        picList: this.uploadPicItem.picList[0].imgIds
                    })
                ],
                submit: false,
            }
            api.dayInspection_report(params).then((res) => {
                let msg = type === 'upload' ? '巡查图片上传成功' : '巡查图片删除成功';
                this.$message.success(msg);
                const contents = res.contents || [];
                const curContentItem = contents.find(contentItem => contentItem.clockPointId == this.uploadPicItem.clockPointId);
                if (curContentItem) {
                    this.uploadPicItem.id = curContentItem.id;
                }
            }).catch((err) => {
                console.log('图片删除失败', err);
                let msg = type === 'upload' ? '巡查图片上传失败' : '巡查图片删除失败';
                msg = common.getErrMsg(msg, err);
                this.$message.error(msg);
            }).finally(() => {
                eventHelper.emit('loading-end');
            });
        },
        uploadConstructionFileCallback(type) {
            console.log('uploadConstructionFileCallback', this.constructionFile);
            eventHelper.emit('loading-start');
            let params = {
                id: this.orderInfo.id,
                haveConstruction: this.haveConstruction,
                constructionFileList: this.constructionFile[0].imgIds,
                submit: false,
            }
            api.dayInspection_report(params).then((res) => {
                let msg = type === 'upload' ? '涉库施工照片上传成功' : '涉库施工照片删除成功';
                this.$message.success(msg);
            }).catch((err) => {
                console.log('涉库施工照片保存失败', err);
                let msg = type === 'upload' ? '涉库施工照片上传失败' : '涉库施工照片删除失败';
                msg = common.getErrMsg(msg, err);
                this.$message.error(msg);
            }).finally(() => {
                eventHelper.emit('loading-end');
            });
        },
        // 提交
        submit() {
            if (this.submitLoading) {
                return;
            }
            if (this.outsidePersonNum !== '' && !/^\d+$/.test(String(this.outsidePersonNum))) {
                return this.$message.warning('昨日外来人员数量只能输入自然数');
            }
            let contents = [];
            for (let building in this.checkPointsForm) {
                contents.push(...this.checkPointsForm[building]);
            }
            for (let i = 0; i < contents.length; i++) {
                let item = contents[i];
                if (!item.picList[0].imgIds.length) {
                    return this.$message.warning('还有打卡点未上传图片，请上传后再提交');
                }
                if (!item.abnormal && !item.remark) {
                    return this.$message.warning(`异常打卡点需要填写异常情况`);
                }
            }
            if (this.haveConstruction && !this.constructionFile[0].imgIds.length) {
                return this.$message.warning('有无涉库施工选择“有”时，请先上传图片');
            }
            let params = {
                id: this.orderInfo.id,
                contents: contents.map(item => {
                    return Object.assign({}, item, {
                        abnormal: item.abnormal ? '巡查正常' : '巡查异常',
                        picList: item.picList[0].imgIds
                    })
                }),
                submit: true,
                outsidePersonNum: this.outsidePersonNum,
                haveConstruction: this.haveConstruction,
            }
            if (params.haveConstruction) {
                params.constructionFileList = this.constructionFile[0].imgIds;
            }
            this.submitLoading = true;
            api.dayInspection_report(params).then((res) => {
                this.$message.success('提交成功');
                this.goBack();
            }).catch((err) => {
                console.log('提交失败', err);
                let msg = common.getErrMsg('提交失败', err);
                this.$message.error(msg);
            }).finally(() => {
                this.submitLoading = false;
            });
        },

        // 生成整改工单
        createRectifyOrder() {
            this.$router.push({
                name: 'reservoirCreateRectifyOrder',
                query: {
                    orderInfo: JSON.stringify(this.orderInfo),
                    isFromDailyPatrolDetail: 1,
                }
            })
        }
    }
});

module.exports = comm;