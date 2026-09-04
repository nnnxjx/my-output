# axiosHelper.js 请求缓存说明

`src/utils/axiosHelper.js` 基于 axios 封装了一层 GET 请求缓存能力：**按需开启（URL 上带 `needCache` 参数）、页面级内存缓存、并发请求合并去重**。本文档描述其缓存链路、状态流转与使用方式。

## 一、核心数据结构

模块内部维护 3 个 `Map`（闭包内，页面生命周期内常驻）：

| Map | 作用 | Key | Value |
| --- | --- | --- | --- |
| `cacheMap` | 存储缓存数据（真正放结果的地方） | cacheKey | 接口响应体 `res` |
| `statusMap` | 存储缓存当前状态 | cacheKey | `'pending'`（请求中）/ `'complete'`（已完成） |
| `callbackMap` | 存放等待状态（pending）的请求回调 | cacheKey | `[{onSuccess, onError}, ...]` 数组 |

### 缓存 Key（cacheKey）的生成规则

```js
const cacheKey = url.replace(/[?&]r=[^&]*&?/g, '');
```

- 使用 **完整请求 URL** 作为唯一标识；
- 会**剔除 URL 上的 `r` 参数**（防浏览器缓存的随机数/时间戳），保证同一接口不同 `r` 值仍命中同一份缓存；
- 注意：key 只由 URL 决定，**不包含请求参数 `data` 与 `config`**。

### 缓存触发条件（必须同时满足）

1. 请求方法为 **GET**（POST 即使传了 `needCache` 也不会缓存）；
2. URL 上带 **`needCache` 参数**（如 `xxx.do?needCache=1`，只要 `getQueryString(url, 'needCache')` 能取到值即可，值随意）。

## 二、缓存链路总览

```
调用 api.get(url)
        │
        ├─ method 是否为 GET 且 URL 带 needCache？
        │        │
        │        ├─ 否 ──────────────────────────► 直接发真实 HTTP 请求（不缓存）
        │        │
        │        └─ 是 ─► 计算 cacheKey（剔除 r 参数）
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
                 └─ 失败（code 非 200 或 HTTP 异常走 catch）
                          ├─ statusMap.delete(key)  ← 删除状态，下次请求重新发起
                          ├─ 依次调用 callbackMap[key] 中所有 onError(response)，随后 delete callbackMap[key]
                          └─ 本次调用自身 reject(response)
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

后来者不发 HTTP，而是把自己的 `resolve/reject` 存进 `callbackMap`，等首个请求完成后统一唤醒：

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

> 这是典型的 **request deduplication / 请求合并** 设计：N 个组件同时请求同一接口，只有 1 个真实 HTTP 请求，N 个调用者拿到同一份结果。

## 四、状态流转（statusMap）

```
        (首次请求)               (业务成功)                (失败/异常)
  [不存在] ──────────► 'pending' ──────────► 'complete' ──────► (delete，回退到"不存在")
                          │
                          │  失败/异常
                          └──────────────► statusMap.delete(key)
```

- `'pending'`：请求已发出但未返回，此期间新调用会被合并；
- `'complete'`：结果已入 `cacheMap`，此后新调用直接读缓存；
- 失败时删除状态：保证**失败不会被缓存**，下次调用会重新发起真实请求。

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

// 3. 不需要缓存的请求：什么都不用改
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
2. **缓存 key 不含请求参数**：同 URL 但 `data`/`params` 不同会命中同一份缓存；GET 的查询参数一般拼在 URL 上（`r` 除外），通常不影响，但拼参方式需保持一致。
3. **仅 GET 生效**：POST 请求一律真实发送。
4. **失败不缓存**：业务 code 非 200 或 HTTP 异常时，`statusMap` 中的状态被删除，下次调用会重新发起请求。
5. **`needCache` 的值不参与判断**：只判断该参数是否存在（非 null），`needCache=1`、`needCache=true`、`needCache=0` 效果相同。
