# appPictureVideoUpload 组件逻辑链路说明

> 本文档描述 `app-picture-video-upload` 组件内部的完整逻辑链路，并贴出对应的关键代码，便于理解与二次开发。
> 组件的使用方式、props 参数说明请见同目录 [README.md](./README.md)。

## 1. 文件组成

| 文件 | 作用 |
| --- | --- |
| `index.js` | 组件逻辑（Vue 组件定义、图片/视频采集、上传、删除等） |
| `content.html` | 组件模板（操作表、上传面板、隐藏 input/canvas、视频播放浮层） |
| `index.scss` | 组件样式 |
| `services.js` | 上传/删除接口地址配置与请求封装 |
| `image.png` | README 配图 |

## 2. 总体链路图

```
点击 "+" 按钮 openActionSheet(num)
        │
        ├── 上传中(progressVisible)？── 是 → toast 拦截，结束
        ├── item.type === 'video' ？── 是 → captureVideo() 进入视频链路
        ├── !isSelectPhotolibrary ？── 是 → selectCamera() 直接拍照
        └── 弹出 mt-actionsheet（拍照 / 从相册里选取）
                ├── 拍照 → selectCamera()
                └── 相册 → selectPhotolibrary()
                        ├── 微信环境(checkIsWechatEnv) → openCamera_wx()
                        ├── 有原生插件 window.imagePicker → getMultiPics() 多选
                        ├── 有原生插件 Camera → openCamera() 单张
                        └── 抛异常(无原生能力, H5) → selectLocalPic() 兜底

无论哪条来源，图片最终都汇聚到统一入口：
        selectPicCallback(imageUri, callback)
                │
                ▼
        getPic() ── Image 加载 + canvas 绘制水印 → canvas.toDataURL('image/jpeg')
                │
                ├── autoUpload === false ──→ 仅 push 本地 url 到 uploadImgs，回调成功（不上传）
                └── autoUpload === true
                        ▼
                getImgUploadFormData() ── base64 → ArrayBuffer → Blob → FormData
                        ▼
                uploadFile() ── $.ajax 上传（进度条 + 安全超时保护）
                        ▼
                uploadFileCallback() ── imgIds.push(id)、uploadImgs.push(url)
                        ▼
                $emit('update:picList') / $emit('uploadCallback')
```

## 3. 入口链路：openActionSheet

点击模板中的 "+" 按钮后进入 `openActionSheet`，这里是所有上传行为的分流口：

```js
//打开上传图片操作表
async openActionSheet(num) {
    if (this.progressVisible) {
        this.$toast('图片上传中，请稍后再试');
        return;
    }
    this.imgNum = num; // 记录当前操作的是 picList 中的哪一组图片
    if (this.picList[num].type === 'video') {
        this.captureVideo(); // 视频类型直接走录像链路
        return;
    }
    locateModel.getLocateInfo(true).then((res) => {
        this.locateInfo = res || {}; // 预取定位信息，供地址水印使用
    });
    if (!this.isSelectPhotolibrary) {
        this.selectCamera(); // 不允许从相册选择时，直接调起相机
        return;
    }
    this.sheetVisible = true; // 弹出 mt-actionsheet 操作表
}
```

`imgNum` 是贯穿整个上传流程的关键索引，后续所有读写都基于 `this.picList[this.imgNum]`。

## 4. 平台分流链路：App / 微信 / H5

### 4.1 拍照：selectCamera

```js
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
        this.noticeFlag = false; // “请横拍”提示只弹一次
    } else {
        try {
            if (checkIsWechatEnv) {
                this.openCamera_wx('camera');
            } else {
                this.openCamera(Camera.PictureSourceType.CAMERA);
            }
        } catch (error) {
            this.selectLocalPic() // 无 Cordova Camera 能力时，降级为 H5 文件选择
        }
    }
}
```

### 4.2 相册：selectPhotolibrary

```js
//调用相册
selectPhotolibrary() {
    try {
        if (checkIsWechatEnv) {
            this.openCamera_wx('album');
        } else {
            if (this.isMultiSelect && window.imagePicker && window.imagePicker.getPictures) {
                this.getMultiPics(); // 原生相册多选
            } else {
                this.openCamera(Camera.PictureSourceType.PHOTOLIBRARY); // 原生相册单选
            }
        }
    } catch (error) {
        this.selectLocalPic() // H5 兜底
    }
}
```

### 4.3 原生相机：openCamera（Cordova）

```js
openCamera(sourceType) {
    var cameraOptions = {
        quality: 100,
        destinationType: Camera.DestinationType.FILE_URI, // 返回本地文件 URI
        sourceType: sourceType,
        encodingType: Camera.EncodingType.JPEG,
        ...
    };
    if (!this.picList[this.imgNum].isUnLimitedSize) {
        Object.assign(cameraOptions, {
            targetWidth: 1024,  // 默认限制尺寸，减小上传体积
            targetHeight: 768,
        })
    }
    navigator.camera.getPicture((mediaFiles) => {
        this.selectPicCallback(mediaFiles) // 拿到 URI 后进入统一回调
    }, (error) => {}, cameraOptions);
}
```

### 4.4 H5 兜底：selectLocalPic

当设备没有 Cordova 原生能力（或在浏览器中运行）时，通过动态创建 `input[type=file]` 选图：

```js
// h5端选择图片
selectLocalPic() {
    const isVideo = this.curPicListItem.type === 'video';
    if (isVideo) {
        this.$refs.videoInput.click(); // 视频走模板中隐藏的 <input ref="videoInput">
        return;
    }

    let input = document.createElement('input')
    input.type = 'file'
    input.multiple = true // 启用多选
    input.click()
    input.onchange = async () => {
        const files = Array.from(input.files)
        if (!files.length) return

        // 校验 1：数量限制（limit 减去已上传数量）
        const remainingSlots = this.picList[this.imgNum].limit - this.picList[this.imgNum].uploadImgs.length
        if (remainingSlots < files.length) {
            this.$message.warning(`最多还能选择${remainingSlots}张图片`);
            return;
        }

        // 校验 2：格式限制，仅允许 jpg/png
        const allowedTypes = ['image/jpeg', 'image/png'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            this.$message.warning('请上传 JPG或PNG 格式的图片');
            return;
        }

        // 串行处理：一张完成后再处理下一张，避免并发上传导致 UI/进度混乱
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                let imageUri = URL.createObjectURL(file) // File 对象 → 本地 blob URL
                await new Promise((resolve, reject) => {
                    this.selectPicCallback(imageUri, (success) => {
                        success ? resolve() : reject();
                    });
                });
            } catch (error) {
                console.error('图片上传失败:', error);
                this.$message.error(`第${i + 1}张图片上传失败`);
                continue; // 单张失败不阻断后续图片
            }
        }
    }
}
```

## 5. 统一处理链路：selectPicCallback

所有来源（App 相机、App 相册、微信、H5）的图片最终都汇聚到 `selectPicCallback`，由它衔接"本地处理 → 上传 → 回写"：

```js
// 选择图片回调
selectPicCallback(imageUri, callback) {
    let params = {
        imageUri: imageUri,
        address: this.picList[this.imgNum].address,
        cb: (url) => {
            // 模式一：非自动上传 —— 只做本地回显，不发请求
            if (!this.autoUpload) {
                this.picList[this.imgNum].uploadImgs.push({
                    url: url,
                    showDelOperation: false,
                    additional: [],
                });
                callback && callback(true);
                return;
            }
            // 模式二：自动上传 —— 组装 FormData 并请求后端
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
}
```

## 6. 水印处理链路：getPic（canvas）

`getPic` 是图片进入上传流程前的"加工车间"：把图片画到隐藏的 `<canvas ref="canvas">` 上，按配置叠加时间/地址水印，再统一导出为 jpeg 的 base64：

```js
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
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            if (this.isMarkTime) {
                const timeStr = moment().format('YYYY-MM-DD HH:mm:ss');
                ctx.fillText(`时间: ${timeStr}`, 20, 40); // 时间水印
            }
            if (this.isMarkAddress) {
                if (!this.locateInfo.address) {
                    this.locateInfo = await locateModel.getLocateInfo(true);
                }
                const address = this.locateInfo.address || '暂未获取到地址信息';
                ctx.fillText(`地址: ${address}`, 20, 70); // 地址水印
            }

            params.cb(canvas.toDataURL('image/jpeg')) // 导出带水印的 base64，交给 cb 继续上传
        }
    }, 500)
}
```

要点：

- 模板中 `<canvas style="display: none" ref="canvas">` 即在此处使用；
- 输出的是 `data:image/jpeg;base64,...` 字符串，而非原始 File 对象。

## 7. 上传链路：getUploadUrl → getImgUploadFormData → uploadFile

### 7.1 接口地址：getUploadUrl + services.js

按 `serviceKey`（产品线）和 `isCompress`（是否压缩）选择接口：

```js
getUploadUrl(type = 'img') {
    const apiId = {
        'gwxj': this.isCompress && type === 'img' ? 'batchUploadFile_gwxj_compress' : 'batchUploadFile_gwxj',
        'psgs': this.isCompress && type === 'img' ? 'batchUploadFile_psgs_compress' : 'batchUploadFile_psgs',
        'iot':  this.isCompress && type === 'img' ? 'batchUploadFile_iot_compress'  : 'batchUploadFile_iot',
    }[this.serviceKey]
    const apiUrl = uploadServices.serviceEndpoint[apiId]
    const url = uploadServices.getPath({url: apiUrl}) // services.js 中拼接 token
    return url;
}
```

`services.js` 中的接口配置：

```js
const serviceEndpoint = {
    batchUploadFile_psgs: psgsUrl + '/uploadFile/batchUploadFile',
    batchUploadFile_psgs_compress: psgsUrl + '/uploadFile/batchUploadFileCompressImage',
    deleteFile_psgs: psgsUrl + '/uploadFile/deleteById',

    batchUploadFile_gwxj: gwxjUrl + '/uploadFile/batchUploadFile',
    batchUploadFile_gwxj_compress: gwxjUrl + '/uploadFile/batchUploadFileCompressImage',
    deleteFile_gwxj: gwxjUrl + '/uploadFile/deleteById',

    batchUploadFile_iot: iotUrl + '/uploadFile/batchUploadFile',
    batchUploadFile_iot_compress: iotUrl + '/uploadFile/batchUploadFileCompressImage',
    deleteFile_iot: iotUrl + '/uploadFile/deleteById',
}
```

### 7.2 base64 → FormData：getImgUploadFormData

```js
getImgUploadFormData(bizType, dataurl, bizId) {
    let imageName = new Date().getTime();
    // 去掉 base64 头，并解码为二进制
    let bytes = window.atob(dataurl.split(',')[1]);
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
}
```

### 7.3 真正上传：uploadFile（进度条 + 安全超时）

```js
uploadFile(formData, url) {
    return new Promise((resolve, reject) => {
        url = url || this.getUploadUrl();
        this.progressVisible = true;
        this.progressPercent = 0;

        const timeout = 30 * 1000; // 30秒

        // 安全超时保护：即使 xhr 无响应也能结束等待、关闭进度条
        let safetyTimeoutId = setTimeout(() => {
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
                        this.progressHandler(progress); // 驱动模板中的 el-progress 圆形进度条

                        // 有进度更新时重置安全超时（上传仍在推进）
                        clearTimeout(safetyTimeoutId);
                        safetyTimeoutId = setTimeout(() => {
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
                    resolve(res.data); // 后端返回文件 id
                } else {
                    reject(res);
                }
            },
            error: (err) => {
                clearTimeout(safetyTimeoutId);
                this.progressVisible = false;
                const errorMsg = err.statusText === 'timeout' ? '上传超时，请检查网络后重试' : '上传失败，请稍后再试';
                reject({msg: errorMsg, originalError: err});
            }
        });
    });
}
```

## 8. 回写链路：uploadFileCallback

上传成功后，把后端返回的 `id` 与本地预览 `url` 写回 `picList`，并通过 `.sync` 语法糖同步给父组件：

```js
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
    this.$emit('update:picList', this.picList); // 配合父组件 :picList.sync
    this.$emit('uploadCallback', 'upload');
}
```

最终业务方提交表单时，通常提取 `imgIds` 传给后台：

```js
picOfBefore: this.picList[0].imgIds.join(',')
```

## 9. 视频链路：captureVideo → uploadVideo → fileTransferUpload

当 `picList` 项的 `type === 'video'` 时，`openActionSheet` 直接进入录像：

```js
captureVideo() {
    if (!navigator.device || !navigator.device.capture) {
        this.$refs.videoInput.click() // 无原生能力时，退化为模板中隐藏的 file input
        return;
    }
    let captureSuccess = mediaFiles => {
        const file = mediaFiles[0];
        this.uploadVideo(file);
    };
    let config = {
        limit: 1,      // 录像文件个数
        duration: 30,  // 录像时长(秒)
    };
    navigator.device.capture.captureVideo(captureSuccess, captureError, config);
}
```

视频上传使用 Cordova `FileTransfer`（适合大文件），带 2 分钟超时和失败重试 3 次：

```js
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
    const uploadUrl = this.getUploadUrl('video');
    const dataurl = file.fullPath
    options.fileName = file.name;

    const ft = new FileTransfer();
    ft.onprogress = this.progressHandler;

    return new Promise((resolve, reject) => {
        this.progressPercent = 0;
        const timeout = 2 * 60 * 1000; // 2分钟超时
        const timeoutId = setTimeout(() => {
            ft.abort && ft.abort();
            reject({ msg: '上传超时，请检查网络后重试', code: 'TIMEOUT' });
        }, timeout);

        ft.upload(dataurl, encodeURI(uploadUrl), result => {
            clearTimeout(timeoutId);
            const res = JSON.parse(result.response);
            if (res && res.success) {
                resolve(res.data);
            } else {
                reject(false);
            }
        }, err => {
            clearTimeout(timeoutId);
            reject({ msg: '上传失败，请稍后重试', code: 'UPLOAD_ERROR', error: err });
        }, options);
    })
}
```

成功后同样走 `uploadFileCallback` 回写列表。无原生能力的 H5 视频则由模板中的隐藏 input 触发：

```html
<input style="display: none" type="file" ref="videoInput" @change="videoChange" accept=".mp4,.webm">
```

```js
videoChange(e) {
    let file = e.target.files[0];
    if (!file) return;

    this.$refs.videoInput.value = ''  // 重置 input，保证连续选择同名文件也能触发 change

    let m = file.size / 1024 / 1024
    if (m > 500) { this.$message({ message: '视频不能大于500M', type: 'error' }); return false }
    if (!["video/mp4", "video/webm"].includes(file.type)) {
        this.$message({ message: '请选择正确的视频文件，例如mp4、webm', type: 'error' });
        return false
    }

    const picListItem = this.picList[this.imgNum];
    let formData = new FormData();
    formData.append('file_data', file);
    formData.append('token', serviceHelper.getToken());
    formData.append('bizId', picListItem.bizId || '');
    formData.append('bizType', picListItem.bizType);
    formData.append('filename', imageName + file.name);

    let url = this.getUploadUrl('video');
    this.uploadFile(formData, url).then(data => {
        const videoFileUrl = URL.createObjectURL(file)
        this.uploadFileCallback(data, videoFileUrl);
    }).catch((err) => { ... });
}
```

## 10. 删除链路：deleteImage → deleteImgFun

模板中长按（`touchStart`/`showDelOperation`）或点右上角 × 均调用 `deleteImage`，内部先弹确认框，再按 `serviceKey` 调对应删除接口：

```js
deleteImgFun(num, index, list) {
    const picListItem = this.picList[num];
    const type = picListItem.type === 'video' ? '视频' : '图片'
    if (!!list[num].limit > 0) { // limit 为 0 表示只读，无删除权限
        this.$dialog.confirm({
            title: '删除'+type,
            mes: '确认是否删除'+type,
            opts: [
                {
                    txt: '确认删除',
                    color: true,
                    callback: () => {
                        if (!list[num].imgIds[index]) {
                            // 尚未上传到后台（如非自动上传模式），仅移除本地记录
                            list[num].uploadImgs.splice(index, 1);
                            list[num].imgIds.splice(index, 1);
                            return;
                        }
                        const apiId = {
                            'gwxj': 'deleteFile_gwxj',
                            'psgs': 'deleteFile_psgs',
                            'iot':  'deleteFile_iot',
                        }[this.serviceKey]
                        const params = { id: list[num].imgIds[index] };
                        eventHelper.emit('loading-start');
                        uploadServices[apiId](params).then(res => {
                            list[num].uploadImgs.splice(index, 1);
                            list[num].imgIds.splice(index, 1);
                            this.$set(this.picList, num, Object.assign({}, list[num], {
                                uploadImgs: [...list[num].uploadImgs],
                                imgIds: [...list[num].imgIds]
                            }))
                            this.$dialog.toast({ mes: '删除成功', icon: 'success', timeout: 1500 });
                            this.$emit('deleteCallback', 'delete')
                        }).catch(err => { ... }).finally(() => {
                            eventHelper.emit('loading-end');
                        })
                    }
                },
                { txt: '取消删除', color: false, callback: () => { ... } }
            ]
        });
    } else {
        this.$dialog.toast({ mes: '没有删除图片权限', icon: 'error', timeout: 1500 });
    }
}
```

## 11. 预览链路

- 图片预览：点击缩略图触发 `picPreView`，通过 `eventHelper.emit('showBigPic', ...)` 交给全局大图预览组件：

```js
picPreView(num, index) {
    const picList = this.picList[num].uploadImgs.map(i => ({ url: i.url }))
    eventHelper.emit('showBigPic', {
        index: index,          // 当前点击图片下标
        picList: picList,      // 需要预览的图片数组
    })
}
```

- 视频播放：点击播放按钮打开组件内的浮层播放器，点击遮罩关闭：

```html
<div class="picUploadPanel_play-video-wrapper" v-if="isShowPlayVideo" @click="isShowPlayVideo = false;">
    <video :src="playVideoUrl" autoplay controls @click.stop=""></video>
</div>
```

```js
playVideo(url) {
    this.playVideoUrl = url;
    this.isShowPlayVideo = true;
}
```

## 12. 对外交互（events）

| 事件 | 触发时机 | 说明 |
| --- | --- | --- |
| `update:picList` | 上传/回写成功后 | 配合父组件 `:picList.sync` 同步数据 |
| `uploadCallback` | 上传成功后 | 参数为 `'upload'` |
| `deleteCallback` | 删除成功后 | 参数为 `'delete'` |
| `additionalClick` | 点击"关联"按钮 | 携带 `{ itemIndex, picIndex }`，用于业务侧扩展图片关联能力 |

## 13. 链路速查（一图流）

| 阶段 | 方法 | 关键动作 |
| --- | --- | --- |
| 入口 | `openActionSheet` | 防重入、分流 video/拍照/相册 |
| 采集 | `selectCamera` / `selectPhotolibrary` / `getMultiPics` / `openCamera_wx` / `selectLocalPic` | 按平台能力选择采集方式，H5 为兜底 |
| 统一入口 | `selectPicCallback` | 衔接处理与上传，区分 `autoUpload` |
| 加工 | `getPic` | canvas 绘制 + 时间/地址水印 → base64 |
| 组包 | `getImgUploadFormData` | base64 → Blob → FormData（含 token/bizType/bizId） |
| 上传 | `uploadFile`（图） / `fileTransferUpload`（视频） | $.ajax / FileTransfer，进度 + 超时 + 重试 |
| 回写 | `uploadFileCallback` | imgIds + uploadImgs，$emit 同步父组件 |
| 删除 | `deleteImgFun` | 确认框 → 按产品线调删除接口 → $set 更新 |
| 预览 | `picPreView` / `playVideo` | 全局大图事件 / 组件内视频浮层 |
