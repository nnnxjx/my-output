# axiosHelper.js 请求缓存说明

`src/utils/axiosHelper.js` 基于 axios 封装了一层 GET/POST 请求缓存能力：**按需开启、页面级内存缓存、并发请求合并去重**。当前版本统一通过 URL 上的 `needCache` 参数开启缓存；第三个参数中的 `needcache` / `needCache` 配置不会触发缓存。

## 一、核心数据结构

模块内部维护 3 个 `Map`（闭包内，页面生命周期内常驻）：

| Map | 作用 | Key | Value |
| --- | --- | --- | --- |
| `cacheMap` | 存储缓存数据（真正放结果的地方） | cacheKey | 接口响应体 `res` |
| `statusMap` | 存储缓存当前状态 | cacheKey | `'pending'`（请求中）/ `'complete'`（已完成） |
| `callbackMap` | 存放等待状态（pending）的请求回调 | cacheKey | `[{onSuccess, onError}, ...]` 数组 |

### 缓存 Key（cacheKey）的生成规则

```js
const cacheKey = method + ':' + normalizeUrl(url) + ':' + stableStringify(data);
```

- 请求方法、**完整请求 URL** 和请求数据 `data` 共同组成唯一标识；
- 会**剔除 URL 上的 `r` 参数**（防浏览器缓存的随机数/时间戳），保证同一接口不同 `r` 值仍命中同一份缓存；
- `stableStringify` 会递归排序对象字段，因此 `{a: 1, b: 2}` 与 `{b: 2, a: 1}` 会生成相同 key；
- 数组顺序会保留，`[1, 2]` 与 `[2, 1]` 会被视为不同请求。

### 缓存触发条件

GET 和 POST 使用相同的触发方式：URL 上必须带有值的 `needCache` 参数，例如 `?needCache=1`。

源码通过 `getQueryString(url, 'needCache')` 的返回值做真值判断，因此：

- `needCache=1`、`needCache=true`、`needCache=0` 都会开启缓存，因为它们都是非空字符串；
- `needCache=` 不会开启缓存；
- 参数名匹配不区分大小写；
- 第三个参数中的 `{ needcache: true }` 或 `{ needCache: true }` 当前不会生效。

## 二、缓存链路总览

```
调用 api.get(...) / api.post(...)
        │
        ├─ URL 上是否存在有值的 needCache 参数？
        │        │
        │        ├─ 否 ──────────────────────────► 直接发真实 HTTP 请求（不缓存）
        │        │
        │        └─ 是 ─► 根据 method + URL + 稳定序列化的 data 计算 cacheKey
        │                 │
        │                 ├─ statusMap 中无该 key ─► 记 statusMap[key] = 'pending'，发真实请求
        │                 │
        │                 └─ statusMap 中有该 key
        │                          │
        │                          ├─ 状态 'complete' ─► 直接返回 Promise.resolve(cacheMap[key])
        │                          │                     （不发 HTTP，同步走缓存）
        │                          │
        │                          └─ 状态 'pending' ──► 不发 HTTP，把本次调用的
        │                                                {onSuccess: resolve, onError: reject}
        │                                                推入 callbackMap[key]，挂起等待
        │
        └─ 真实请求返回后（then）
                 │
                 ├─ res.code === '200'（业务成功）
                 │        ├─ statusMap[key] = 'complete'
                 │        ├─ cacheMap[key] = res（写入缓存）
                 │        ├─ 依次调用 callbackMap[key] 中所有 onSuccess(res)，随后 delete callbackMap[key]
                 │        └─ 本次调用自身 resolve(res)
                 │
                 ├─ 业务失败（HTTP 成功但 code 非 '200'）
                 │        ├─ statusMap.delete(key)
                 │        ├─ 首个调用者 resolve(res)
                 │        └─ 当前代码未清理/唤醒 callbackMap，合并进来的调用者会一直 pending
                 │
                 └─ HTTP/Axios 异常（进入 catch）
                          └─ 当前 catch 引用了作用域外的 res，会抛出 ReferenceError，
                             状态、等待队列和外层 Promise 都可能无法正常结算
```

## 三、三种典型执行路径

### 1. 首次请求（无缓存）→ 标记 pending，真实发请求

```js
statusMap.set(cacheKey, 'pending');
// 随后进入 new Promise(...) 真正调用 axiosIns 发起请求
```

### 2. 缓存命中（complete）→ 直接返回缓存，不发请求

```js
if (currentStatus === 'complete') {
    return Promise.resolve(cacheMap.get(cacheKey));
}
```

### 3. 请求进行中（pending）→ 合并请求（去重）

后来者不发 HTTP，而是把自己的 `resolve/reject` 存进 `callbackMap`。当前实现只有业务成功时会统一唤醒这些调用者：

```js
if (currentStatus === 'pending') {
    return new Promise((resolve, reject) => {
        if (callbackMap.has(cacheKey)) {
            callbackMap.get(cacheKey).push({ onSuccess: resolve, onError: reject });
        } else {
            callbackMap.set(cacheKey, [{ onSuccess: resolve, onError: reject }]);
        }
    });
}
```

> 这是典型的 **request deduplication / 请求合并** 设计：N 个组件同时请求同一接口，正常成功时只有 1 个真实 HTTP 请求，N 个调用者拿到同一份结果。当前异常路径存在未结算等待 Promise 的问题，见“已知限制”。

## 四、状态流转（statusMap）

```
  [不存在] ──首次缓存请求──► 'pending' ──业务成功──► 'complete'
                                │
                                ├─业务失败──► statusMap.delete(key)
                                │              （callbackMap 仍残留）
                                │
                                └─HTTP 异常──► catch 中触发 ReferenceError，
                                               可能继续停留在 pending
```

- `'pending'`：请求已发出但未返回，此期间新调用会被合并；
- `'complete'`：结果已入 `cacheMap`，此后新调用直接读缓存；
- 业务失败会删除状态，不写入结果缓存；但当前不会清理 `callbackMap`。
- HTTP/Axios 异常路径由于 `res` 作用域错误，可能无法删除 `pending` 状态。

## 五、使用方式

```js
// 1. 初始化（一般应用启动时执行一次），得到 api 对象（含 get / post）
const api = axiosHelper.initAxios();

// 2. 开启缓存的 GET：URL 上拼 needCache 参数
api.get('/api/dict/list.do?needCache=1').then((res) => {
    if (res.code === '200') {
        // 首次：真实请求；之后：直接取内存缓存
    }
});

// 3. 开启缓存的 POST：同样在 URL 上添加 needCache
api.post('/api/dict/search.do?needCache=1', {
    type: 'facility',
    areaId: 100
});

// 字段顺序不同仍会命中同一份缓存，不会再次发送 HTTP 请求
api.post('/api/dict/search.do?needCache=1', {
    areaId: 100,
    type: 'facility'
});

// 4. 不需要缓存的请求：什么都不用改
api.get('/api/monitor/realtime.do'); // 不带 needCache，每次都真实请求
```

## 六、适用场景

| 场景 | 是否适合缓存 | 说明 |
| --- | --- | --- |
| 字典、枚举、公共配置 | ✅ 适合 | 数据基本不变，且常被多个组件同时请求 |
| 组织架构、区域树、权限配置 | ✅ 适合 | 页面生命周期内低频变化 |
| 首屏多个组件并发拉同一基础数据 | ✅ 适合 | 请求合并，避免重复请求 |
| 实时监测数据、告警列表、统计图表 | ❌ 不适合 | 无过期机制，会一直读到旧数据 |

### 场景 1：字典、枚举、公共配置（✅）

这类数据一次拉取后整个页面周期内基本不变，且往往被表单、表格、筛选器等多个控件反复使用，加 `needCache` 后只有第一次真实请求：

```js
// 表单初始化时拉取"设施类型"字典
function getFacilityTypeDict() {
    return api.get('/api/dict/facilityType.do?needCache=1');
}

// 下拉框初始化
getFacilityTypeDict().then((res) => {
    this.facilityTypeOptions = res.data || [];
});

// 之后其他地方（如表格列渲染、搜索筛选器）再次调用同一接口
// → 直接命中 cacheMap，不再发请求
getFacilityTypeDict().then((res) => {
    this.filterOptions = res.data || [];
});
```

### 场景 2：组织架构、区域树、权限配置（✅）

组织树/区域树的数据量往往较大、请求耗时较长，且可能被地图、左侧导航、报表明头等多处共享：

```js
// 地图模块初始化时拉取区域树
api.get('/api/org/regionTree.do?needCache=1').then((res) => {
    mapModule.regionTree = res.data;
});

// 另一个模块（如报表页）也需要同一棵树
// → 直接返回缓存，避免重复传输大树结构
api.get('/api/org/regionTree.do?needCache=1').then((res) => {
    reportModule.regionTree = res.data;
});
```

### 场景 3：首屏多组件并发拉同一基础数据（✅ 请求合并）

首屏渲染时，多个组件在各自的 `created` / `mounted` 里同时请求同一接口。由于第一个请求把 `statusMap[key]` 置为 `'pending'`，其余并发调用会被合并进 `callbackMap`，**实际只发出 1 个 HTTP 请求**，所有调用方同时拿到结果：

```js
// 组件 A、B、C 在首屏几乎同时执行下面这行
const p1 = api.get('/api/common/currentUser.do?needCache=1'); // ← 真实请求（置 pending）
const p2 = api.get('/api/common/currentUser.do?needCache=1'); // ← 挂入 callbackMap 等待
const p3 = api.get('/api/common/currentUser.do?needCache=1'); // ← 挂入 callbackMap 等待

// 网络只发出 1 次请求；返回后 p1、p2、p3 全部 resolve 同一份 res
Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => {
    console.log(r1 === r2 && r2 === r3); // true，三者引用同一份缓存对象
});
```

### 场景 4：实时监测、告警、图表数据（❌ 不要加 needCache）

这类数据会持续变化，而本缓存在页面生命周期内**永不过期、无手动清空入口**，一旦缓存就永远是首次请求的旧数据：

```js
// ❌ 错误示例：监测数据/告警列表绝不能加 needCache
api.get('/api/monitor/realtimeList.do?needCache=1'); // 之后刷新永远读到首次的旧数据

// ✅ 正确做法：不带 needCache，每次都真实请求
api.get('/api/monitor/realtimeList.do').then((res) => {
    this.renderChart(res.data);
});
```

> 同理，接口数据的**写操作（增/删/改）之后**如果需要刷新关联的列表，也不要依赖缓存，或直接刷新页面让内存缓存失效。

## 七、注意事项 / 已知限制

1. **无 TTL、无失效接口**：缓存写入后不会自动过期，也没有提供手动清空 `cacheMap` 的入口，仅在刷新页面（内存释放）后失效。给"页面生命周期内不变"的数据用没问题，给会变化的数据用会导致脏读。
2. **缓存 key 包含请求数据**：同 URL 但 `data`/`params` 不同不会错误复用缓存；普通对象的字段顺序不影响 key，数组顺序仍然影响 key。
3. **GET 与 POST 均可缓存**：两者都只通过 URL 中有值的 `needCache` 参数开启；配置对象中的同名字段不生效。
4. **业务失败的等待队列未结算**：`code !== '200'` 时会删除 `statusMap` 并 resolve 首个请求，但不会调用或删除 `callbackMap`，并发跟随者会一直 pending，回调也会残留。
5. **HTTP 异常路径存在作用域错误**：`.catch()` 内使用了只在 `.then()` 中声明的 `res`，会触发 `ReferenceError`。应直接按 URL 缓存开关清理状态，并使用 `response` reject 等待者。
6. **`returnOriginData` 与业务码判断不兼容**：启用该配置后 `res` 是完整 Axios response，`res.code` 通常不存在，缓存请求会被当作业务失败处理。
7. **仅字符串 `'200'` 被视为成功**：若后端返回数值 `200`，当前严格比较不会写入缓存或唤醒等待者。
8. **存在未使用的开关函数**：源码仍保留 `isCacheEnabled(url, config)`，但请求流程没有调用它，所以该函数中对配置对象的兼容逻辑实际上不会生效。
