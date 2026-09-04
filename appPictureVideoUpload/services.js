// 字典数据请求
define([
    'services/serviceHelper',
    'services/axiosHelper'],
    function (serviceHelper, axiosHelper) {
        const { getToken } = serviceHelper;
        const gwxjUrl = serviceHelper.getGwxjUrl()
        const psgsUrl = serviceHelper.getPsgsUrl()
        const ewaterUrl = serviceHelper.geEwaterPath()
        const iotUrl = serviceHelper.getIOTPath()

        const serviceEndpoint = {
            batchUploadFile_psgs: psgsUrl + '/uploadFile/batchUploadFile', // 上传图片-psgs
            batchUploadFile_psgs_compress: psgsUrl + '/uploadFile/batchUploadFileCompressImage', // 上传图片-psgs
            deleteFile_psgs: psgsUrl + '/uploadFile/deleteById', // 删除图片-psgs

            batchUploadFile_gwxj: gwxjUrl + '/uploadFile/batchUploadFile', // 上传图片-gwxj
            batchUploadFile_gwxj_compress: gwxjUrl + '/uploadFile/batchUploadFileCompressImage', // 上传图片-gwxj
            deleteFile_gwxj: gwxjUrl + '/uploadFile/deleteById', // 删除图片-gwxj

            batchUploadFile_iot: iotUrl + '/uploadFile/batchUploadFile', // 上传图片-iot
            batchUploadFile_iot_compress: iotUrl + '/uploadFile/batchUploadFileCompressImage', // 上传图片-iot
            deleteFile_iot: iotUrl + '/uploadFile/deleteById', // 删除图片-iot
        }

        /**
         * 获取请求路径
         * @param {Object} params 
         * params.url: 请求接口路径
         * params.parameter: get请求的参数
         * params.everToken: 永久token（非必传）
         * @returns 
         */
        const getPath = function (params) {
            let url = params.url
            if (!url) {
                console.log('ERROR: no url');
                return '';
            }
            const userToken = params.everToken ? params.everToken : getToken();
            url += '?token=' + userToken;
            url += '&r=' + Math.random();

            if (!!params.parameter) {
                const parameters = params.parameter;
                let parameterURL = '';
                for (var key in parameters) {
                    parameterURL += '&' + key + '=' + parameters[key];
                }
                return encodeURI(url + parameterURL);
            }
            return url;
        }
        // 发送get请求[promise]
        const sendGet = function (name, param, everToken) {
            if (!serviceEndpoint[name]) {
                console.warn(`[找不到${name}的接口配置]`)
                return Promise.resolve()
            }
            const url = getPath({
                url: serviceEndpoint[name],
                parameter: param,
                everToken: everToken
            })
            return new Promise((resolve, reject) => {
                const config = {
                    responseType: 'json',
                    headers: {
                        hmtkn: serviceHelper.getToken()
                    }
                };
                if (param.headers) {
                    config.headers = Object.assign(config.headers, param.headers)
                }
                $axios.get(url, {}, config).then((result) => {
                    if (result.success || result.code == 200) resolve(result.data)
                    else reject(result)
                }).catch(err => {
                    reject(err)
                })
            })

        }

        const getGwxjPicUrl = (picId) => {
            return gwxjUrl + '/uploadFile/downloadFileById?id=' + picId + '&token=' + getToken();
        }
        const getPsgsPicUrl = (picId) => {
            return psgsUrl + '/uploadFile/downloadFileById?id=' + picId + '&token=' + getToken();
        }
        const getIotPicUrl = (picId) => {
            return iotUrl + '/uploadFile/downloadFileById?id=' + picId + '&token=' + getToken();
        }

        return {
            serviceEndpoint: serviceEndpoint,
            getPath: getPath,
            // 删除附件-psgs
            deleteFile_psgs: param => sendGet('deleteFile_psgs', param),
            // 删除附件-gwxj
            deleteFile_gwxj: param => sendGet('deleteFile_gwxj', param),
            // 删除附件-gwxj
            deleteFile_iot: param => sendGet('deleteFile_iot', param),

            getGwxjPicUrl,
            getPsgsPicUrl,
            getIotPicUrl,
        }
    })