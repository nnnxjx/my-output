define(['axios','qs'],function (axios,qs) {
    //将axios设置为全局变量
    window.axios = axios;
    window.qs = qs;
    // 存储缓存数据
    const cacheMap = new Map();
    // 存储缓存当前状态 'pending' || 'complete'
    const statusMap = new Map();
    // 存放等待状态的请求回调
    const callbackMap = new Map();
    return {
        //初始化axios实例，设置默认参数
        initAxios: () =>{
            function getQueryString(url,param) {
                var reg = new RegExp("(^|&)" + param + "=([^&]*)(&|$)", "i");
                url = url.replace('?','&')
                var r = url.substr(1).match(reg);
                if (r != null) return r[2];
                return null;
            }
            let axiosIns = axios.create({});
            
            axiosIns.defaults.headers.post['X-Requested-With'] = 'XMLHttpRequest';
            axiosIns.defaults.headers.get['X-Requested-With'] = 'XMLHttpRequest';
            axiosIns.defaults.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            axiosIns.defaults.responseType = 'json';
            axiosIns.defaults.transformRequest = [
                function (data) {
                    //数据序列化
                    return window.qs.stringify(data, {indices: false});
                }
            ];
            axiosIns.defaults.validateStatus = function (status) {
                return true;
            };
            axiosIns.interceptors.request.use(function (config) {
                //配置config
                config.headers.Accept = 'application/json';
                return config;
            });
            axiosIns.interceptors.response.use( (response)=> {
                let data = response.data;
                let status = response.status;
                if (status === 200) {
                    //请求返回正常  
                    return Promise.resolve(response);
                } else if(status==401){
                    //token过期，提示重新登录
                    this.vueInstance.alertReLogin();
                } else {
                    //请求异常
                    return Promise.reject(response);
                }
            });
            let ajaxMethod = ['get', 'post'];
            let api = {};
            ajaxMethod.forEach((method)=> {
                //数组取值的两种方式
                api[method] =  (url, data, config = {})=> {
                    //用完整请求作为唯一key
                    const cacheKey = url.replace(/[?&]r=[^&]*&?/g,'');
                    if(method==='get'){
                        // 判断是否需要缓存
                        if (getQueryString(url,'needCache')) {
                            if (statusMap.has(cacheKey)) {
                                const currentStatus = statusMap.get(cacheKey)

                                // 判断当前的接口缓存状态，如果是 complete ，则代表缓存完成
                                if (currentStatus === 'complete') {
                                    return Promise.resolve(cacheMap.get(cacheKey))
                                }

                                // 如果是 pending ，则代表正在请求中，这里放入回调函数
                                if (currentStatus === 'pending') {
                                    return new Promise((resolve, reject) => {
                                        if (callbackMap.has(cacheKey)) {
                                            callbackMap.get(cacheKey).push({
                                                onSuccess: resolve,
                                                onError: reject
                                            })
                                        } else {
                                            callbackMap.set(cacheKey, [
                                                {
                                                    onSuccess: resolve,
                                                    onError: reject
                                                }
                                            ])
                                        }
                                    })
                                }
                            }

                            statusMap.set(cacheKey, 'pending')
                        }
                    }

                    return new Promise(function (resolve, reject) {
                        axiosIns(Object.assign({
                            method: method,
                            url: url,
                            [method === 'get' ? 'params' : 'data']: data
                        }, config))
                        .then((response)=> {
                            let res = config && config.returnOriginData ? response : response.data
                            if (res.code === "200") {
                                statusMap.set(cacheKey, 'complete')
                                cacheMap.set(cacheKey, res)
                            } else {
                                // 不成功的情况下删掉 statusMap 中的状态，能让下次请求重新请求
                                statusMap.delete(cacheKey)
                            }
                            // 这里触发resolve的回调函数
                            if (callbackMap.has(cacheKey)) {
                                callbackMap.get(cacheKey).forEach((callback) => {
                                    callback.onSuccess(res)
                                })
                                // 调用完成之后清掉，用不到了
                                callbackMap.delete(cacheKey)
                            }
                            resolve(res);
                        })
                        .catch((response)=> {
                            // 不成功的情况下删掉 statusMap 中的状态，能让下次请求重新请求
                            statusMap.delete(cacheKey)
                            // 这里触发reject的回调函数
                            if (callbackMap.has(cacheKey)) {
                                callbackMap.get(cacheKey).forEach((callback) => {
                                    callback.onError(response)
                                })
                                // 调用完成之后也清掉
                                callbackMap.delete(cacheKey)
                            }
                            reject(response);
                        })
                    })
                }
            });
            return api;
        }
    }
});