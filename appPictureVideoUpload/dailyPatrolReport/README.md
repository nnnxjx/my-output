# dailyPatrolReport 中 `app-picture-video-upload` 的使用说明

本文档说明 `dailyPatrolReport` 页面中，`app-picture-video-upload` 组件是如何接入、初始化以及如何把上传结果回写到巡检表单中的。

---

## 1. 页面里使用了两处上传能力

这个页面中，`app-picture-video-upload` 主要出现在两个地方：

1. **打卡点巡查图片上传弹窗**
   - 每个打卡点都可以单独上传图片
   - 点击每个点右侧的相机按钮打开上传弹窗
   - 上传完成后会立即回写到当前打卡点数据里

2. **涉库施工图片上传区域**
   - 当“有无涉库施工”为“有”时，显示施工照片上传组件
   - 上传结果会保存到 `constructionFile` 中
   - 上传后会同步调用保存接口

---

## 2. 组件接入方式

页面模板中使用方式如下。

### 2.1 打卡点图片上传弹窗

```html
<div class="upload-pic-dialog" v-show="isOpenUploadPic">
    <div class="upload-pic-dialog-content">
        <div class="upload-pic-box">
            <app-picture-video-upload
                serviceKey="gwxj"
                ref="appPictureUpload"
                :picList.sync="uploadPicItem.picList"
                @uploadCallback="uploadPicCallback"
                @deleteCallback="uploadPicCallback">
            </app-picture-video-upload>
        </div>
        <div class="close-btn">
            <i class="el-icon-error" @click="closeUploadPic"></i>
        </div>
    </div>
</div>
```

### 2.2 涉库施工图片上传

```html
<app-picture-video-upload
    v-else
    serviceKey="gwxj"
    ref="constructionFileUpload"
    :picList.sync="constructionFile"
    @uploadCallback="uploadConstructionFileCallback"
    @deleteCallback="uploadConstructionFileCallback">
</app-picture-video-upload>
```

---

## 3. 这两个地方的共同点

两个位置都传了这几个关键参数：

- `serviceKey="gwxj"`
  - 表示当前项目使用巡检模块对应的上传服务
- `:picList.sync="xxx"`
  - 组件内部更新图片列表后，会同步回父组件
- `@uploadCallback`
  - 上传成功后触发
- `@deleteCallback`
  - 删除成功后触发

---

## 4. 页面初始化时，先把后台数据转换成组件所需结构

### 4.1 涉库施工图片初始化

后台返回的数据会被转换成 `constructionFile` 组件所需格式：

```js
initConstructionFile(res) {
    this.constructionFile[0].imgIds = res.constructionFile.map(item => item.id) || [];
    this.constructionFile[0].uploadImgs = res.constructionFile.map(item => {
        return { url: serviceHelper.getGwxjPicUrl(item.id) }
    });
}
```

### 4.2 打卡点图片初始化

每个打卡点都会创建一个 `picList`，这个结构正好就是上传组件要求的结构：

```js
let newItem = {
    id: 0,
    clockPointId: item.id,
    clockPointName: item.checPointName,
    abnormal: true,
    remark: '',
    picList: [
        {
            bizType: 'dayInspectionContentPic',
            limit: this.isDetail ? 0 : 9,
            uploadImgs: [],
            imgIds: [],
            require: true,
        }
    ],
}
```

如果是详情页，还会把后台已保存的图片回填进来：

```js
newItem.picList[0].imgIds = curContentItem.dayInspectionContentPic.map(pic => pic.id);
newItem.picList[0].uploadImgs = curContentItem.dayInspectionContentPic.map(pic =>{
    return { url: serviceHelper.getGwxjPicUrl(pic.id) }
})
```

---

## 5. 打卡点上传图片的使用逻辑

### 5.1 点击相机按钮打开弹窗

```html
<div class="pic-btn" @click="openUploadPic(item)">
    <img :src="imgUrls.pic_icon" v-if="item.picList[0].imgIds.length">
    <img :src="imgUrls.camera_icon" v-else>
</div>
```

### 5.2 打开弹窗时，把当前打卡点对象保存到 `uploadPicItem`

```js
openUploadPic(item) {
    this.uploadPicItem = item;
    this.isOpenUploadPic = true;
},
closeUploadPic() {
    this.isOpenUploadPic = false;
}
```

这里的核心点是：**弹窗里上传的图片，只会作用到当前被点击的那个打卡点。**

### 5.3 上传 / 删除回调统一保存

```js
uploadPicCallback(type) {
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
        let msg = type === 'upload' ? '巡查图片上传失败' : '巡查图片删除失败';
        msg = common.getErrMsg(msg, err);
        this.$message.error(msg);
    }).finally(() => {
        eventHelper.emit('loading-end');
    });
}
```

也就是说：

- 上传完成后，先拿到 `picList[0].imgIds`
- 再把当前打卡点信息组装成 `contents`
- 调用 `dayInspection_report`
- 后端保存成功后，页面提示成功并更新当前项的 `id`

---

## 6. 涉库施工上传的使用逻辑

这个区域是另一个独立的图片组，直接绑定到 `constructionFile`。

### 6.1 页面中是否展示上传组件，取决于 `haveConstruction`

```html
<template v-if="haveConstruction">
    <template v-if="isDetail">
        <div class="construction-pic-list" v-if="constructionFile[0].uploadImgs.length">
            <div class="construction-pic-item" v-for="(pic, idx) in constructionFile[0].uploadImgs" :key="idx">
                <img :src="pic.url">
            </div>
        </div>
        <div class="construction-no-pic" v-else>暂无图片</div>
    </template>
    <app-picture-video-upload
        v-else
        serviceKey="gwxj"
        ref="constructionFileUpload"
        :picList.sync="constructionFile"
        @uploadCallback="uploadConstructionFileCallback"
        @deleteCallback="uploadConstructionFileCallback">
    </app-picture-video-upload>
</template>
```

### 6.2 上传 / 删除后的保存逻辑

```js
uploadConstructionFileCallback(type) {
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
        let msg = type === 'upload' ? '涉库施工照片上传失败' : '涉库施工照片删除失败';
        msg = common.getErrMsg(msg, err);
        this.$message.error(msg);
    }).finally(() => {
        eventHelper.emit('loading-end');
    });
}
```

这里的逻辑比较直接：

- 组件内部维护 `constructionFile[0].imgIds`
- 上传或删除后，立即把最新图片列表同步到后台
- 后台只保存图片 id 列表，不直接保存前端对象

---

## 7. 提交前的校验逻辑

页面在真正提交巡检报告时，会校验这两个上传区域是否都满足要求。

### 7.1 打卡点图片必须上传

```js
for (let i = 0; i < contents.length; i++) {
    let item = contents[i];
    if (!item.picList[0].imgIds.length) {
        return this.$message.warning('还有打卡点未上传图片，请上传后再提交');
    }
    if (!item.abnormal && !item.remark) {
        return this.$message.warning(`异常打卡点需要填写异常情况`);
    }
}
```

### 7.2 如果选择了“有涉库施工”，施工照片也必须上传

```js
if (this.haveConstruction && !this.constructionFile[0].imgIds.length) {
    return this.$message.warning('有无涉库施工选择“有”时，请先上传图片');
}
```

### 7.3 最终提交时带上图片 id

```js
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
```

---

## 8. 这个页面和上传组件的关系可以总结为

`dailyPatrolReport` 本身不负责文件选择、预览、删除、进度展示这些细节，
它只是：

1. 准备好上传组件需要的数据结构
2. 通过 `picList.sync` 绑定上传结果
3. 在 `uploadCallback / deleteCallback` 里调用保存接口
4. 在提交前统一校验图片是否齐全

也就是说，`app-picture-video-upload` 是这个页面的“通用图片能力层”，而 `dailyPatrolReport` 负责的是“业务数据组织和保存”。

---

## 9. 这个页面里上传组件的关键数据结构

### 打卡点图片

```js
picList: [
    {
        bizType: 'dayInspectionContentPic',
        limit: this.isDetail ? 0 : 9,
        uploadImgs: [],
        imgIds: [],
        require: true,
    }
]
```

### 涉库施工图片

```js
constructionFile: [{
    bizType: 'dayInspection_constructionFile',
    limit: 9,
    uploadImgs: [],
    imgIds: [],
}]
```

这两种结构本质一样，都是给 `app-picture-video-upload` 使用的标准入参。

---

## 10. 一句话总结

`dailyPatrolReport` 页面通过 `app-picture-video-upload` 完成了两类图片上传：**打卡点巡查图片** 和 **涉库施工图片**。页面先将后台数据转换成组件所需的 `picList` 结构，再通过 `:picList.sync`、`uploadCallback` 和 `deleteCallback` 把上传结果实时同步回业务接口，最终在提交时统一携带图片 id 提交给后端。
