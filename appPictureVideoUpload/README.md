## app 和 h5 端图片上传组件说明

### 该组件是基于原来的cesc-app-components组件库里的appPictureUpload进行改造优化，兼容h5和app端的图片上传功能，减少组件对于外部方法的依赖
### 已将相关图片上传删除相关的接口请求配置放置组件内部，方便迁移使用。

#### 可将该组件放置在项目的全局组件文件夹里使用
![readmeImgs_1.png](./image.png)

##使用
```
<in-app-picture-upload ref="inAppPictureUpload" :picList.sync="picList" serviceKey="gwxj"></in-app-picture-upload>
```

### 组件props参数说明

```
props: {
    // 上传图片数组说明
    // picList: [{
    //     title: '', // 上传图片类型名字 （非必要，通常是要的）
    //     bizType: '', // 上传到后台的bizType (图片上传是必要，只是做图片回显时可以不传)
    //     limit: 9, // 最大上传数量，只是查看图片时，传0
    //     address: '', // 水印地址 （非必要）
    //     date: '', // 水印日期 （非必要）
    //     uploadImgs: [{url: url}], // 上传图片回显链接集合 （必要，）
    //     imgIds: [], // 上传图片id集合 (必要，用来存放图片上传完之后后台返回的图片id)
    //     require: false, // 图片是否必传，用于控制必填的红色 * 显示（非必要）
    //     isHidesmallNotice: false, // 是否隐藏 ‘(拍照请横拍)’ 这个提示文字，默认不隐藏（非必要）
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
    }
}
```
##### picList 的通常使用情况
```
picList: [
    {
        title: '维修前照片',  // 上传图片标题
        bizType: 'picOfBefore_pumpPatrol', // 后台保存的bizType
        limit: 9,
        date: moment().format('YYYY-MM-DD'), // 水印日期（选填，不需要水印可以不填）
        uploadImgs: [], // 保存图片的数组
        imgIds: [], // 上传图片成功后回调的图片id数组
        require: true
    }
],
```
##### 最后传给后台时，通常是提取里面的imgIds的图片id传给后台
```
picOfBefore: this.picList[0].imgIds.join(',')
```

## 后续优化：兼容不自动上传的情况