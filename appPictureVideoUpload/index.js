const template = require('./content.html');
const serviceHelper = require("services/serviceHelper");
const uploadServices = require('./services');
const moment = require("moment");
const eventHelper = require('utils/eventHelper');
const locateModel = require('@IN/model/locateModel');
// const { checkIsWechatEnv } = require("utils/wechatSdkUtils");
const checkIsWechatEnv = false; // TODO: 暂时是false，后续需要支持微信公众号再引入上面的

require('./index.scss');
const comm = Vue.extend({
    template: template,
    props: {
        // 上传图片数组说明
        // picList: [{
        //     title: '', // 上传图片类型名字
        //     bizType: '', // 上传到后台的bizType
        //     limit: 9, // 最大上传数量，只是查看图片时，传0
        //     address: '', // 水印地址
        //     date: '', // 水印日期
        //     uploadImgs: [{}], // 上传图片回显链接集合
        //     imgIds: [], // 上传图片id集合
        //     require: false, // 图片是否必传，用于控制必填的红色 * 显示
        //     isHidesmallNotice: false, // 是否隐藏 '(拍照请横拍)' 这个提示文字，默认不隐藏
        //     isAdditional: false, // 是否显示底部关联相关的，默认不显示 (特殊业务需要，一般用不到)
        //     isAdditionalDetail: false, // 是否显示底部关联相关的，默认不显示 (特殊业务需要，一般用不到)
        // }]
        // 上传图片数组 (必传)
        picList: {
            type: Array,
            default: function() {
                return []
            }
        },

        // 第一次拍照时，是否显示提示信息，默认false（非必传）
        isShowNotice: {
            type: Boolean,
            default: false
        },
        // 图片上传的服务关键字 区分各个产品线 (图片上传时必传，只是做图片回显时可以不传)
        // psgs: psgs的
        // gwxj: 巡检模块
        // iot: 在线监测
        serviceKey: {
            type: String,
            default: ''
        },
        // 是否调用压缩接口上传
        isCompress: {
            type: Boolean,
            default: false,
        },
        bizId: {
            type: [String, Number],
            default: '',
        },

        // 是否自动上传
        autoUpload: {
            type: Boolean,
            default: true,
        },
        // 是否多选
        isMultiSelect: {
            type: Boolean,
            default: true,
        },

        // 是否需要时间水印
        isMarkTime: {
            type: Boolean,
            default: true,
        },
        // 是否需要地址水印
        isMarkAddress: {
            type: Boolean,
            default: false,
        },
        bgGray: {
            type: Boolean,
            default: true,
        },
        // 是否需要从相册选择， 默认true
        isSelectPhotolibrary: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            sheetVisible: false,//上传图片操作表显隐
            localActions: [{
                name: '拍照',
                method: this.selectCamera
            }, {
                name: '从相册里选取',
                method: this.selectPhotolibrary
            }],//上传图片操作表选项
            noticeFlag: true,//第一次出现横拍照片提示
            imgNum: '', // 当前操作的那种图片的索引
            picShowTiem: null,
            timmer: 0,//开始长按时间
            timmerThread: null,//图片长按setTimeout事件
            locateInfo: {},

            progressVisible: false,//进度条的显示和隐藏
            progressPercent:0,//进度条进度
            fileTransfer: null,

            playVideoUrl: null,
            isShowPlayVideo: false,
        }
    },
    computed: {
        curPicListItem() {
            return this.picList[this.imgNum]
        },
    },
    methods: {
        //打开上传图片操作表
        async openActionSheet(num) {
            //  console.log('打开上传图片操作表', this.progressVisible)
            if (this.progressVisible) {
                this.$toast('图片上传中，请稍后再试');
                return;
            }
            this.imgNum = num;
            if (this.picList[num].type === 'video') {
                this.captureVideo();
                return;
            }
            locateModel.getLocateInfo(true).then((res) => {
                this.locateInfo = res || {};
            });
            if (!this.isSelectPhotolibrary) {
                this.selectCamera();
                return;
            }
            this.sheetVisible = true;
        },
        touchStart: function (num, index) {
            this.timmer = new Date().getTime();
            this.timmerThread = setTimeout(function () {
                this.showDelOperation(num, index);
            }.bind(this), 1000)
        },
        touchEnd: function (num, index) {
            var endTime = new Date().getTime();
            if (endTime - this.timmer < 1000) {
                clearTimeout(this.timmerThread);
                eventHelper.emit('showComponentBigPic', {
                    index: index,//当前点击图片下标
                    picList: this.picList[num].uploadImgs,//需要预览的图片数组
                })
            }
            this.timmer = 0;
        },
        picPreView(num, index) {
            const picList = this.picList[num].uploadImgs.map(i => {
                return { url: i.url }
            })
            eventHelper.emit('showBigPic', {
                index: index,//当前点击图片下标
                picList: picList,//需要预览的图片数组
            })
        },
        //显示删除图片图标
        showDelOperation: function (num, index) {
            this.picList[num].uploadImgs[index].showDelOperation = true;
            Vue.set(this.picList[num].uploadImgs, index, this.picList[num].uploadImgs[index])
            if (!!this.picList[num].uploadImgs[index] && !!this.picList[num].uploadImgs[index].showDelOperation) {
                this.picShowTiem = setTimeout(() => {
                    this.picList[num].uploadImgs[index].showDelOperation = false;
                    Vue.set(this.picList[num].uploadImgs, index, this.picList[num].uploadImgs[index])
                }, 2000)
            }
        },
        //删除该图片
        deleteImage(num, index) {
            this.deleteImgFun(num, index, this.picList);
            if (!!this.picShowTiem) clearTimeout(this.picShowTiem)
        },
        //调用相机拍照
        selectCamera() {
            if (this.noticeFlag && this.isShowNotice) {
                this.$dialog.alert({
                    mes: '请横拍照片', callback: function () {
                        if (checkIsWechatEnv) {
                            this.openCamera_wx('camera');
                        } else {
                            this.openCamera(Camera.PictureSourceType.CAMERA);
                        }
                    }.bind(this)
                });
                this.noticeFlag = false;
            } else {
                try {
                    if (checkIsWechatEnv) {
                        this.openCamera_wx('camera');
                    } else {
                        this.openCamera(Camera.PictureSourceType.CAMERA);
                    }
                } catch (error) {
                    this.selectLocalPic()
                }
            }
        },
        //调用相册
        selectPhotolibrary() {
            try {
                if (checkIsWechatEnv) {
                    this.openCamera_wx('album');
                } else {
                    console.log('【window.imagePicker】', window.imagePicker);
                    if (this.isMultiSelect && window.imagePicker && window.imagePicker.getPictures) {
                        this.getMultiPics();
                    } else {
                        this.openCamera(Camera.PictureSourceType.PHOTOLIBRARY);
                    }
                }
            } catch (error) {
                this.selectLocalPic()
            }
        },

        // 相册图片多选
        getMultiPics() {
            if (!window.imagePicker) return;
            let uploadedLength = this.picList[this.imgNum].imgIds.length;
            let limit = this.picList[this.imgNum].limit
            let maximumImagesCount = limit ? limit - uploadedLength : 9;
            const options = {
                width: 1024,
                height: 768,
                maximumImagesCount: maximumImagesCount
            }
            
            // 创建一个 Promise 来包装 imagePicker.getPictures
            const getPicturesPromise = new Promise((resolve, reject) => {
                window.imagePicker.getPictures((results) => {
                    resolve(results);
                }, (error) => {
                    console.log('【Error: 】' + error);
                    reject(error);
                }, options);
            });

            // 使用 async/await 处理串行上传
            (async () => {
                try {
                    const results = await getPicturesPromise;
                    console.log('【ImagePicker】', results);
                    
                    // 串行处理每张图片
                    for (let i = 0; i < results.length; i++) {
                        console.log('【Image URI:】 ' + results[i]);
                        const imageUri = results[i];
                        
                        // 等待当前图片上传完成后再处理下一张
                        await new Promise((resolve, reject) => {
                            this.selectPicCallback(imageUri.path, (success) => {
                                if (success) {
                                    resolve();
                                } else {
                                    reject();
                                }
                            });
                        });
                    }
                } catch (error) {
                    console.error('图片上传过程中出错:', error);
                    this.$toast('部分图片上传失败，请重试');
                }
            })();
        },

        //调用手机相机方法
        openCamera(sourceType) {
            const mediaType = Camera.MediaType.PICTURE;
            var cameraOptions = {
                quality: 100,                                            //相片质量0-100
                destinationType: Camera.DestinationType.FILE_URI,        //返回类型：DATA_URL= 0，返回作为 base64 編碼字串。 FILE_URI=1，返回影像档的 URI。NATIVE_URI=2，返回图像本机URI (例如，資產庫)
                sourceType: sourceType,             //从哪里选择图片：PHOTOLIBRARY=0，相机拍照=1，SAVEDPHOTOALBUM=2。0和1其实都是本地图库
                allowEdit: false,                                        //在选择之前允许修改截图
                encodingType: Camera.EncodingType.JPEG,                   //保存的图片格式： JPEG = 0, PNG = 1
                // targetWidth: 1024,                                        //照片宽度
                // targetHeight: 768,                                       //照片高度
                mediaType: mediaType,                                             //可选媒体类型：圖片=0，只允许选择图片將返回指定DestinationType的参数。 視頻格式=1，允许选择视频，最终返回 FILE_URI。ALLMEDIA= 2，允许所有媒体类型的选择。
                cameraDirection: 0,                                       //枪后摄像头类型：Back= 0,Front-facing = 1
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: true
            };
            if (!this.picList[this.imgNum].isUnLimitedSize) {
                Object.assign(cameraOptions, {
                    targetWidth: 1024,                                        //照片宽度
                    targetHeight: 768,                                       //照片高度
                })
            }
            navigator.camera.getPicture((mediaFiles) => {
                console.log('navigator.camera.getPicture' + mediaFiles);
                this.selectPicCallback(mediaFiles)
            }, (error) => {

            }, cameraOptions);
        },
        // 微信公众号上传图片
        openCamera_wx(sourceType) {
            let uploadedLength = this.picList[this.imgNum].imgIds.length;
            let limit = this.picList[this.imgNum].limit
            let maximumImagesCount = limit ? limit - uploadedLength : 9;
            wx.chooseImage({
                count: maximumImagesCount, // 默认9
                sizeType: ["original", "compressed"], // 可以指定是原图还是压缩图，默认二者都有
                sourceType, // 可以指定来源是相册还是相机，默认二者都有
                success: (res) => {
                    // 创建一个 Promise 来包装图片处理过程
                    const processImages = async () => {
                        try {
                            // 串行处理每张图片
                            for (let i = 0; i < res.localIds.length; i++) {
                                const localId = res.localIds[i];
                                // 将 wx.getLocalImgData 包装成 Promise
                                const imageData = await new Promise((resolve, reject) => {
                                    wx.getLocalImgData({
                                        localId: localId,
                                        success: (res) => {
                                            let imageUri = res.localData;
                                            if (imageUri.indexOf("data:image") === -1) {
                                                imageUri = "data:image/jpeg;base64," + imageUri.replace(/\r|\n/g, "");
                                            }
                                            resolve(imageUri);
                                        },
                                        fail: reject
                                    });
                                });

                                // 等待当前图片上传完成后再处理下一张
                                await new Promise((resolve, reject) => {
                                    this.selectPicCallback(imageData, (success) => {
                                        if (success) {
                                            resolve();
                                        } else {
                                            reject();
                                        }
                                    });
                                });
                            }
                        } catch (error) {
                            console.error('图片上传过程中出错:', error);
                            this.$toast('部分图片上传失败，请重试');
                        }
                    };

                    // 执行图片处理
                    processImages();
                }
            })
        },
        // h5端选择图片
        selectLocalPic() {
            const isVideo = this.curPicListItem.type === 'video';
            if (isVideo) {
                this.$refs.videoInput.click();
                return;
            }

            let input = document.createElement('input')
            input.type = 'file'
            input.multiple = true // 启用多选
            input.click()
            input.onchange = async () => {
                const files = Array.from(input.files)
                if (!files.length) return

                // 检查是否超出限制
                const remainingSlots = this.picList[this.imgNum].limit - this.picList[this.imgNum].uploadImgs.length
                if (remainingSlots < files.length) {
                    this.$message.warning(`最多还能选择${remainingSlots}张图片`);
                    return;
                }
                
                // 只允许常见的图片格式：jpg、jpeg、png、gif
                const allowedTypes = ['image/jpeg', 'image/png'];
                const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
                if (invalidFiles.length > 0) {
                    this.$message.warning('请上传 JPG或PNG 格式的图片');
                    return;
                }
                
                // 串行处理每个选中的文件
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    try {
                        let imageUri = URL.createObjectURL(file)
                        // 等待当前图片上传完成后再处理下一张
                        await new Promise((resolve, reject) => {
                            this.selectPicCallback(imageUri, (success) => {
                                if (success) {
                                    resolve();
                                } else {
                                    reject();
                                }
                            });
                        });
                    } catch (error) {
                        console.error('图片上传失败:', error);
                        this.$message.error(`第${i + 1}张图片上传失败`);
                        // 继续处理下一张图片
                        continue;
                    }
                }
            }
        },
        uploadFileCallback(res, url) {
            let id = res.id;
            if (!!this.picList[this.imgNum].imgIds) {
                this.picList[this.imgNum].imgIds.push(id)
            } else {
                this.picList[this.imgNum].imgIds = [];
                this.picList[this.imgNum].imgIds.push(id)
            }
            this.picList[this.imgNum].uploadImgs.push({
                url: url,
                createDate: res.createDate,
                showDelOperation: false,
                additional: [], // 附加关联信息
            });
            this.$emit('update:picList', this.picList);
            this.$emit('uploadCallback', 'upload');
            // this.imgNum = '';
        },
        // 选择图片回调
        selectPicCallback(imageUri, callback) {
            let params = {
                imageUri: imageUri,
                address: this.picList[this.imgNum].address,
                cb: (url) => {
                    //上传图片后回调返回图片id
                    if (!this.autoUpload) {
                        this.picList[this.imgNum].uploadImgs.push({
                            url: url,
                            showDelOperation: false,
                            additional: [], // 附加关联信息
                        });
                        callback && callback(true);
                        return;
                    }
                    const formData = this.getImgUploadFormData(this.picList[this.imgNum].bizType, url, this.bizId)
                    this.uploadFile(formData).then(data => {
                       this.uploadFileCallback(data, url);
                       callback && callback(true);
                    }).catch((err) => {
                        console.log('图片上传失败', err)
                        const msg = err && err.msg ? err.msg : '图片上传失败，请稍后再试';
                        this.$toast(msg)
                        callback && callback(false);
                    });
                }
            };
            this.getPic(params);
        },
        /**
         *  把图片本地路径转化为图片文件
         */
        getPic(params) {
            setTimeout(() => {
                var img = new Image;
                img.src = params.imageUri;
                img.onload = async () => {
                    var canvas = this.$refs.canvas;
                    canvas.width = img.width;
                    canvas.height = img.height;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    ctx.font = "22px 微软雅黑";
                    ctx.fillStyle = "rgba(252,255,255,0.9)";
                    ctx.shadowColor = "rgba(0, 0, 0, 0.5)"; // 阴影颜色为半透明黑色
                    ctx.shadowBlur = 5; // 阴影模糊程度
                    ctx.shadowOffsetX = 2; // 阴影在 X 轴的偏移量
                    ctx.shadowOffsetY = 2; // 阴影在 Y 轴的偏移量

                    if (this.isMarkTime) {
                        const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
                        ctx.fillText(`时间: ${timeStr}`, 20, 40); //时间
                    }
                    if (this.isMarkAddress) {
                        if (!this.locateInfo.address) {
                            this.locateInfo = await locateModel.getLocateInfo(true);
                        }
                        const address = this.locateInfo.address || '暂未获取到地址信息';
                        const addtext = `地址: ${address}`;
                        ctx.fillText(addtext, 20, 70); //位置
                    }

                    params.cb(canvas.toDataURL('image/jpeg'))
                }
            }, 500)

        },

        /**
         * 删除照片
         * @param num
         * @param index
         */
        deleteImgFun(num, index, list) {
            const picListItem = this.picList[num];
            const type = picListItem.type === 'video' ? '视频' : '图片'
            if (!!list[num].limit > 0) {
                this.$dialog.confirm({
                    title: '删除'+type,
                    mes: '确认是否删除'+type,
                    opts: [
                        {
                            txt: '确认删除',
                            color: true,
                            callback: () => {
                                if (!list[num].imgIds[index]) {
                                    list[num].uploadImgs.splice(index, 1);
                                    list[num].imgIds.splice(index, 1);
                                    return;
                                }
                                const apiId = {
                                    'gwxj': 'deleteFile_gwxj',
                                    'psgs': 'deleteFile_psgs',
                                    'iot': 'deleteFile_iot',
                                }[this.serviceKey]
                                const params = { id: list[num].imgIds[index] };
                                eventHelper.emit('loading-start');
                                uploadServices[apiId](params).then(res => {
                                    list[num].uploadImgs.splice(index, 1);
                                    list[num].imgIds.splice(index, 1);
                                    // 使用 $set 更新整个对象
                                    this.$set(this.picList, num, Object.assign({}, list[num], {
                                        uploadImgs: [...list[num].uploadImgs],
                                        imgIds: [...list[num].imgIds]
                                    }))
                                    this.$dialog.toast({
                                        mes: '删除成功',
                                        icon: 'success',
                                        timeout: 1500
                                    });
                                    this.$emit('deleteCallback', 'delete')
                                }).catch(err => {
                                    console.log('删除失败-err', err)
                                    const msg = err && err.msg ? err.msg : '删除失败, 请稍后再试'
                                    this.$dialog.toast({
                                        mes: msg,
                                        icon: 'error',
                                        timeout: 1500
                                    });
                                }).finally(() => {
                                    eventHelper.emit('loading-end');
                                })

                            }
                        }, {
                            txt: '取消删除',
                            color: false,
                            callback: () => {
                                this.picList.forEach(pic => {
                                    pic.uploadImgs.forEach(img => {
                                        img.showDelOperation = false;
                                    })
                                });
                            }
                        }
                    ]
                });
            } else {
                this.$dialog.toast({
                    mes: '没有删除图片权限',
                    icon: 'error',
                    timeout: 1500
                });
            }
        },
        getUploadUrl(type = 'img') {
            const apiId = {
                'gwxj': this.isCompress && type === 'img' ? 'batchUploadFile_gwxj_compress' : 'batchUploadFile_gwxj',
                'psgs': this.isCompress && type === 'img' ? 'batchUploadFile_psgs_compress' : 'batchUploadFile_psgs',
                'iot': this.isCompress && type === 'img' ? 'batchUploadFile_iot_compress' : 'batchUploadFile_iot',
            }[this.serviceKey]
            const apiUrl = uploadServices.serviceEndpoint[apiId]
            const url = uploadServices.getPath({url: apiUrl})
            return url;
        },
        getImgUploadFormData(bizType, dataurl, bizId) {
            let imageName = new Date().getTime();
            //去掉url的头，并转换为byte
            let bytes = window.atob(dataurl.split(',')[1]);
            //处理异常,将ascii码小于0的转换为大于0
            let ab = new ArrayBuffer(bytes.length);
            let ia = new Uint8Array(ab);
            for (let i = 0; i < bytes.length; i++) {
                ia[i] = bytes.charCodeAt(i);
            }
            const imageFile = new Blob([ia], { type: 'image/png' });

            let formData = new FormData();
            formData.append('file_data', imageFile);
            formData.append('token', serviceHelper.getToken());
            formData.append('bizId', bizId);
            formData.append('bizType', bizType);
            formData.append('filename', imageName + '.png');
            formData.append('compressMax', 500*1200);
            return formData;
        },
        /**
         * 上传附件
         * @param bizType 必传
         * @param url 必传
         * @param bizId 非必要
         * @returns {Promise}
         */
        uploadFile(formData, url) {
            return new Promise((resolve, reject) => {
                url = url || this.getUploadUrl();
                this.progressVisible = true;
                this.progressPercent = 0;
                
                // 设置超时时间
                const timeout = 30 * 1000; // 30秒
                
                // 安全超时保护机制
                let safetyTimeoutId = setTimeout(() => {
                    console.log('上传安全超时触发');
                    this.progressVisible = false;
                    reject({msg: '上传请求超时，请检查网络后重试'});
                }, timeout + 5000);
                
                $.ajax({
                    type: "post",
                    url: url,
                    data: formData,
                    contentType: false,
                    processData: false,
                    timeout: timeout,
                    xhr: () => {
                        let myXhr = $.xhr ? $.xhr() : $.ajaxSettings.xhr();
                        if (myXhr.upload) {
                            myXhr.upload.addEventListener('progress', (progress) => {
                                console.log('绑定progress事件的回调函数', progress);
                                this.progressHandler(progress);
                                
                                // 有进度更新时重置安全超时
                                clearTimeout(safetyTimeoutId);
                                safetyTimeoutId = setTimeout(() => {
                                    console.log('上传安全超时触发');
                                    this.progressVisible = false;
                                    reject({msg: '上传请求超时，请检查网络后重试'});
                                }, timeout + 5000);
                            }, false);
                        }
                        return myXhr;
                    },
                    success: (res) => {
                        clearTimeout(safetyTimeoutId);
                        this.progressVisible = false;
                        if (res.data && res.data.id) {
                            resolve(res.data);
                        } else {
                            reject(res);
                        }
                    },
                    error: (err) => {
                        clearTimeout(safetyTimeoutId);
                        console.log('uploadFile-error', err);
                        this.progressVisible = false;
                        
                        // 提供更详细的错误信息
                        const errorMsg = err.statusText === 'timeout' ? '上传超时，请检查网络后重试' : '上传失败，请稍后再试';
                        reject({msg: errorMsg, originalError: err});
                    }
                });
                
                // 添加全局错误处理，确保在任何情况下都能关闭进度条
                window.addEventListener('beforeunload', () => {
                    console.log('添加全局错误处理，确保在任何情况下都能关闭进度条');
                    this.progressVisible = false;
                }, {once: true});
            });
        },

        // 点击关联
        additionalClick(itemIndex, picIndex) {
            this.$emit('additionalClick', { itemIndex, picIndex })
        },

         /**
         * 调用相机录像
         */
        captureVideo() {
            console.log(this.curVideo)
            if (!navigator.device || !navigator.device.capture) {
                console.log('[错误]navigator.device.capture不存在', navigator);
                this.$refs.videoInput.click()
                return;
            }
            let captureSuccess = mediaFiles => {
                if (mediaFiles || mediaFiles[0]) {
                    const file = mediaFiles[0];
                    console.log('[录像成功]：', file);
                    console.log('[录像成功]文件名：', file.name);
                    console.log('[录像成功]文件大小', file.size);
                    console.log('[录像成功]localURL：', file.localURL);
                    console.log('[录像成功]fullPath', file.fullPath);
                    this.uploadVideo(file);
                }
            };
            let captureError = error => {
                console.log('[录像失败]', error);
            };
            let config = {
                limit: 1, // 录像文件个数
                duration: 30, // 录像时长(秒)
            };
            navigator.device.capture.captureVideo(captureSuccess, captureError, config);
        },
        uploadVideo(file) {
            this.progressVisible = true;
            this.progressPercent = 0; // 重置进度
            
            // 添加安全超时机制
            const safetyTimeout = 2 * 60 * 1000; // 2分钟安全超时
            const safetyTimer = setTimeout(() => {
                this.progressVisible = false;
                this.__retryCount = 0; // 重置重试计数
                this.$dialog.confirm({
                    title: '提示',
                    mes: '上传超时，请检查网络后重试',
                    opts: [{
                        txt: '确定',
                        color: '#005ea4',
                        callback: () => {}
                    }]
                });
            }, safetyTimeout);
            
            this.fileTransferUpload(file).then((res) => {
                clearTimeout(safetyTimer);
                this.progressVisible = false;
                this.__retryCount = 0; // 重置重试计数
                let id = res.id;
                this.uploadFileCallback(res, file.fullPath);
            }).catch((err) => {
                console.log('fileTransferUpload-失败重试 ', err);
                // 失败重试 3次
                this.__retryCount = this.__retryCount || 0;
                if (this.__retryCount < 3) {
                    this.__retryCount++;
                    clearTimeout(safetyTimer); // 清除之前的安全定时器
                    this.fileTransferUpload(file).then((res) => {
                        clearTimeout(safetyTimer);
                        this.progressVisible = false;
                        this.__retryCount = 0;
                        let id = res.id;
                        this.uploadFileCallback(res, file.fullPath);
                    }).catch(() => {
                        // 重试失败的处理逻辑会进入外层的catch
                    });
                } else {
                    clearTimeout(safetyTimer);
                    this.progressVisible = false;
                    this.__retryCount = 0; // 重置重试计数
                    this.$dialog.confirm({
                        title: '提示',
                        mes: err.msg || '网络异常，视频上传失败',
                        opts: [{
                            txt: '确定',
                            color: '#005ea4',
                            callback: () => {}
                        }]
                    });
                }
            });
            
            // 添加页面卸载事件处理
            const beforeUnloadHandler = () => {
                clearTimeout(safetyTimer);
                this.progressVisible = false;
                this.__retryCount = 0;
            };
            
            window.addEventListener('beforeunload', beforeUnloadHandler);
            
            // 一段时间后移除事件监听器，避免内存泄漏
            setTimeout(() => {
                window.removeEventListener('beforeunload', beforeUnloadHandler);
            }, safetyTimeout + 1000);
        },

        fileTransferUpload(file) {
            const picListItem = this.picList[this.imgNum];
            const params = {
                bizType: picListItem.bizType,
                bizId: picListItem.bizId || '',
                token: serviceHelper.getToken()
            };
            const options = new FileUploadOptions();
            options.fileKey = "file_data";
            options.params = params;
            const uploadUrl = this.getUploadUrl('video'); // 上传地址
            const dataurl = file.fullPath
            // options.fileName = dataurl.substr(dataurl.lastIndexOf('/') + 1);
            options.fileName = file.name;

            const ft = new FileTransfer();
            ft.onprogress = this.progressHandler;

            return new Promise((resolve, reject) => {
                this.progressPercent = 0;

                // 设置超时时间为2分钟
                const timeout = 2 * 60 * 1000;
                const timeoutId = setTimeout(() => {
                    ft.abort && ft.abort(); // 中止上传
                    reject({
                        msg: '上传超时，请检查网络后重试',
                        code: 'TIMEOUT'
                    });
                }, timeout);

                ft.upload(dataurl, encodeURI(uploadUrl), result => {
                    clearTimeout(timeoutId); // 清除超时定时器
                    console.log('ft.upload-result', result)
                    console.log('ft.upload-result', JSON.parse(result.response))
                    const res = JSON.parse(result.response);
                    if (res && res.success) {
                        resolve(res.data);
                    } else {
                        reject(false);
                    }
                }, err => {
                    clearTimeout(timeoutId); // 清除超时定时器
                    console.log('ft.upload-err', err)
                    reject({
                        msg: '上传失败，请稍后重试',
                        code: 'UPLOAD_ERROR',
                        error: err
                    });
                }, options);
            })
        },
        progressHandler(progressEvent) {
            console.log('上传进度：', progressEvent);
            if (progressEvent.lengthComputable) {
              let percentUploaded = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              console.log('上传进度：' + percentUploaded + '%');
              this.progressPercent = percentUploaded;
            }
        },
          

        videoChange(e) {
            console.log('videoChange', e);
            let file = e.target.files[0];
            if (!file) return;
            
            this.$refs.videoInput.value = ''  // 重置input的值

            let m = file.size / 1024 / 1024//兆
            if (m > 500) {
                this.$message({
                    message: '视频不能大于500M',
                    type: 'error'
                })
                return false
            }
            if (!["video/mp4", "video/webm"].includes(file.type)) {
                this.$message({
                    message: '请选择正确的视频文件，例如mp4、webm',
                    type: 'error'
                })
                return false
            }

            const picListItem = this.picList[this.imgNum];
            let imageName = new Date().getTime();
            let formData = new FormData();
            formData.append('file_data', file);
            formData.append('token', serviceHelper.getToken());
            formData.append('bizId', picListItem.bizId || '');
            formData.append('bizType', picListItem.bizType);
            formData.append('filename', imageName+file.name);

            let url = this.getUploadUrl('video');
            this.uploadFile(formData, url).then(data => {
                const videoFileUrl =  URL.createObjectURL(file)
                this.uploadFileCallback(data, videoFileUrl);
             }).catch((err) => {
                 console.log('视频上传失败', err)
                 const msg = err && err.msg ? err.msg : '视频上传失败，请稍后再试';
                 this.$toast(msg)
             });
        },

        playVideo(url) {
            this.playVideoUrl = url;
            this.isShowPlayVideo = true;
        },
    },
    mounted() {

    },
    components: {}
});

module.exports = comm;