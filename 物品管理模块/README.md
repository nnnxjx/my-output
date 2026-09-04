# 物资管理模块说明（物品管理 / 库存管理 / 出入库明细）

本文档描述 `appMaterialModule/modules` 下三个核心业务模块的功能边界、数据结构与逻辑链路：

```
modules/
├─ itemManagement/        物品主数据维护（增删改查 + Excel 导入导出 + 库存预警值设置）
├─ inventoryManagement/   库存台账（库存查询/转移/出库/详情 + 采购申请/审批/入库全流程）
└─ productInOutDetails/   出入库流水（多条件查询 + 记录类型筛选 + 导出 + 详情）
```

## 模块间关系总览

```
                ┌────────────────────────────┐
                │    itemManagement 物品管理   │  物品主数据（编号/名称/规格/类别/预警值）
                └─────────────┬──────────────┘
                              │ 提供产品档案（采购选品、库存展示共用同一套 itemNo/itemName）
                              ▼
┌────────────────────────────────────────────────────────────┐
│                 inventoryManagement 库存管理                 │
│   库存台账（总库存 totalQty + 六片区 areaQtyMap）              │
│    ├─ 采购申请 → 审批（片区长/总部综管员）→ 确认入库 ──┐        │
│    ├─ 转移（片区间调拨）                              ├─► 库存变动│
│    └─ 出库（多领用人明细）                    ─────────┘        │
└─────────────────────────────┬──────────────────────────────┘
                              │ 每次采购入库/出库/转移落一条流水
                              ▼
┌────────────────────────────────────────────────────────────┐
│              productInOutDetails 出入库明细                  │
│   全量流水查询（采购入库/出库/转移）+ 导出 + 详情              │
└────────────────────────────────────────────────────────────┘
```

> `inventoryManagement` 的"产品详情"弹窗内部直接调用 `getProductInOutDetailsPage` 拉取该物品最近 20 条流水，与 `productInOutDetails` 共用同一接口，保证两处流水展示口径一致。

## 一、通用约定

### 1.1 服务层

三个模块的接口统一走 `@MA/services/api`（`services/api.js`），底层由 `apiHelper` 提供 `get / post / postJSON / upload / downloadFile` 五种请求方式。文件下载类接口通过 `{ returnOriginData: true, responseType: 'blob' }` 拿到原始 Blob，再用临时 `<a>` 标签 + `URL.createObjectURL` 触发下载。

### 1.2 响应与列表兜底

各模块对接口返回做了统一风格的兜底，避免后端结构波动导致页面崩溃：

```js
let data = res && res.data ? res.data : res || {};
let records = data.records || data.list || data.rows || [];
```

失败时统一处理：清空 `tableData`、`total` 置 0、`$message.error` 提示，并在收尾恢复 loading。

### 1.3 分页约定

- 参数：`pageNumber / pageSize`；回写：`totalRecord / pageNumber / pageSize`；
- `search` 固定把 `pageNumber` 重置为 1；
- 分页大小变更时同样回到第 1 页。

### 1.4 片区映射表（areaList）

库存模块用一张三重映射的常量表驱动"筛选条件、动态表格列、表单字段、后端数量字段"四处联动，是理解各模块数据流转的关键：

| 片区名称（value / areaCode） | 表单 key | 数量字段前缀（keyInCN） | 后端数量字段 |
| --- | --- | --- | --- |
| 北一片区 | `northOne` | `beiyi` | `beiyiQuantity` / `beiyiInStockQuantity` |
| 北二片区 | `northTwo` | `beier` | `beierQuantity` / `beierInStockQuantity` |
| 东片区 | `east` | `dong` | `dongQuantity` / `dongInStockQuantity` |
| 中片区 | `central` | `zhong` | `zhongQuantity` / `zhongInStockQuantity` |
| 西南片区 | `southWest` | `xinan` | `xinanQuantity` / `xinanInStockQuantity` |
| 益丰片区 | `yifeng` | `yifeng` | `yifengQuantity` / `yifengInStockQuantity` |

### 1.5 权限模型（getMyAuth）

```
loadAuthData → service.getMyAuth()
userAuth = { userId, roleList, wzqpList }   // wzqpList = 授权片区列表

默认查询片区：
  roleList 含 '物资-总部综管员' → areaCode = ''（全部片区）
  否则                        → areaCode = wzqpList[0]（仅授权片区）

isAreaAuthorized(area)：
  wzqpList 为空   → false（全部不可编辑）
  wzqpList 仅 1 个 → area === wzqpList[0]
  wzqpList 多个   → 仅 '益丰片区' 返回 true

getEditableAreaCodes()：提交时新行 areaCode 的取值来源
  （单片区取自身，多片区场景取 '益丰片区'）
```

### 1.6 keep-alive 刷新

`inventoryManagement` 与 `productInOutDetails` 均实现了 `activated()` 钩子，页签切回时自动重新拉取数据；`itemManagement` 仅在 `mounted` 拉取一次。

---

## 二、itemManagement 物品管理

### 2.1 功能概览

- 四条件查询（物品编号/名称/品牌/型号规格）+ 分页；
- 新增 / 编辑物品（同一弹窗，`drawerMode` 区分）；
- 预警设置（固定预警值 `warningFixedValue`，配合库存侧 `earlyWarning` 行高亮）；
- 删除（二次确认 + 防空页翻页回退）；
- Excel 导出（按当前查询条件）、Excel 导入（XLSX）；
- 类别下拉数据来自 `itemType` 字典。

### 2.2 核心数据结构

| 字段 | 说明 |
| --- | --- |
| `queryForm` | itemNo / itemName / brand / modelSpec 四个查询条件 |
| `tableData` / `pagination` | 列表与分页（pageNumber / pageSize / total） |
| `drawerVisible` / `drawerMode` | 新增/编辑弹窗及模式（`'add'` \| `'edit'`） |
| `formModel` | 表单模型，由 `createFormModel()` 工厂生成：itemNo / itemName / brand / modelSpec / unit / category / remark / warningThreshold / warningFixedValue |
| `warningVisible` | 预警设置弹窗 |
| `dictList` | itemType 字典（类别下拉选项） |
| `exporting` / `importing` / `deletingId` | 导出 / 导入 / 删除的全局与行级 loading |

### 2.3 逻辑链路

#### 2.3.1 初始化链路

```
mounted
  └─ Promise.all([ loadTableData(), getDict() ])
       ├─ loadTableData → getSuppliesItemPage(queryForm + 分页)
       └─ getDict → dictModel.getCustomizeSysDict({ groupNames: 'itemType' })
                    → dictList = Object.keys(itemType) → 类别下拉
```

#### 2.3.2 查询 / 分页链路

```
search              → pageNumber = 1            → loadTableData
resetQuery          → 清空 queryForm             → loadTableData
handleSizeChange    → pageSize 变更，pageNumber 归 1 → loadTableData
handleCurrentChange → pageNumber 变更            → loadTableData
```

#### 2.3.3 新增 / 编辑链路（drawerMode 状态机）

```
openAddDialog ──────► drawerMode='add'，formModel = createFormModel()
                            │ 填写表单
                            ▼
openDetailDialog(row) ► drawerMode='edit'
                        getSuppliesItemDetail({ id }) 回填 formModel（drawerLoading）
                            │
                            ▼
submitForm(id, source)
  ├─ 手动校验：itemNo / itemName 必填
  ├─ saveSuppliesItem({ ...formModel, id })    // 新增时 id = 0
  ├─ source === 'warning' → 关预警弹窗；否则关编辑弹窗
  └─ 成功提示按 source / drawerMode 区分 → loadTableData() 刷新
```

#### 2.3.4 预警设置链路

```
openWarningDialog(row)
  → formModel = createFormModel() 合并 row → warningVisible
saveWarningSetting
  → submitForm(currentRow.id, 'warning')     // 复用保存接口，只关心预警字段
```

#### 2.3.5 删除链路

```
deleteItem(row)
  → $confirm（"删除后无法恢复"）
  → deletingId = row.id（行级 loading）→ deleteSuppliesItem({ id })
  → 若本页仅剩 1 条且 pageNumber > 1 → pageNumber -= 1（防止删除后停留在空页）
  → loadTableData()
  → catch：err 为 'cancel' / 'close'（用户取消）时不提示错误
```

#### 2.3.6 导入 / 导出链路

```
导出：exportSuppliesItem(queryForm + 分页)（blob）
      → URL.createObjectURL → a.download = '物品数据.xlsx' → revokeObjectURL

导入：el-upload（http-request=handleImport，before-upload=beforeImportUpload）
      → beforeImportUpload：仅放行标准 XLSX MIME
      → FormData('file') → importSuppliesItem
      → 成功：pageNumber = 1 → loadTableData()
```

### 2.4 接口清单

| 组件方法 | 接口 | 说明 |
| --- | --- | --- |
| loadTableData | getSuppliesItemPage | 物品分页查询 |
| openDetailDialog | getSuppliesItemDetail | 物品详情回填 |
| submitForm | saveSuppliesItem | 新增 / 编辑保存 |
| deleteItem | deleteSuppliesItem | 删除物品 |
| handleExport | exportSuppliesItem | 导出（blob） |
| handleImport | importSuppliesItem | 导入（FormData） |
| getDict | getCustomizeSysDict | itemType 字典 |

### 2.5 注意点

1. `submitForm` 是手动校验（仅 itemNo / itemName），表单未配置 `rules`；
2. 导入仅校验标准 XLSX MIME，xls 老格式会被拦截（与库存模块模板导入"扩展名或 MIME"的判断口径不同）；
3. `loadTableData` 直接读 `res.records`（未做 `res.data` 解包），依赖服务层返回结构，其余模块均走 `res.data` 兜底，统一调整返回结构时需留意；
4. 未实现 `activated` 钩子，keep-alive 页签切回不会自动刷新。

---

## 三、inventoryManagement 库存管理

### 3.1 功能概览（弹窗全景）

本模块是三个模块中交互最重的一个，主列表之外共 8 个弹层：

| 弹窗 | 触发入口 | 说明 |
| --- | --- | --- |
| 产品采购申请 `purchaseVisible` | "采购申请"按钮 | 三段式：申请表单 → 选品/导入清单 → 二次确认 |
| 选择现有产品 `selectProductVisible` | "添加现有产品" | filterable + allow-create，watch 自动带出档案字段 |
| 确认采购申请 `confirmPurchaseVisible` | "确认申请" | 汇总校验后的提交前确认 |
| 审批/入库管理 `requestDialogVisible` | "审批管理" / "入库管理" | 三类列表（待审批/待入库/我的上报）+ 卡片式审批 |
| 产品详情 `detailVisible` | 行内"查看" | 物品档案 + 最近 20 条出入库流水 |
| 库存转移 `transferVisible` | 行内"转移" | 源/目标片区库存实时联动展示 |
| 产品出库 `outboundVisible` | 行内"出库" | 多领用人明细行 |
| 确认入库 `inventoryConfirmVisible` | `confirmInventory` | 预留（依赖的 `hasInventoryData` 未定义，当前不可达） |

### 3.2 权限模型（重点）

权限贯穿本模块所有写操作，链路如下：

```
mounted/activated → loadAuthData()
  ├─ roleList 含 '物资-总部综管员'：
  │    · 片区筛选 Tab 渲染 areaList 全量（含"全部片区"）
  │    · queryForm.areaCode 默认 ''（查全部）
  └─ 否则：
       · 片区筛选 Tab 仅渲染 userAuth.wzqpList
       · queryForm.areaCode 默认 wzqpList[0]

isAreaAuthorized(area) 控制所有"按片区填数量"的输入框 disabled 态：
  · 采购选品弹窗六片区数量输入框
  · 采购清单虚拟表格六片区数量输入框
  · 待入库列表"实际入库数量"输入框
```

### 3.3 核心数据结构

| 字段 | 说明 |
| --- | --- |
| `areaList` | 六片区常量（value / key / keyInCN 三重映射，见 1.4） |
| `userAuth` | getMyAuth 结果：userId / roleList / wzqpList |
| `tableData` / `pagination` | 库存分页数据（行内含 `areaQtyMap` 各片区数量、`earlyWarning` 预警标记） |
| `purchaseForm` / `selectProductForm` / `confirmPurchaseForm` | 采购申请三段式表单 |
| `resubmitId` | 驳回重提时携带的原申请 id，提交成功后复位为 `''` |
| `requestDialogListType` / `requestList` / `requestDialogPagination` | 审批弹窗三类列表（待审批 / 待入库 / 我的上报） |
| `hasAuthApproveNum` / `hasAuthInStockNum` / `hasAuthResubmitNum` | 待办角标计数 |
| `transferForm` / `outboundForm` | 转移、出库表单 |
| `purchaseVirtualScroll` | 采购清单虚拟滚动参数（见 3.5） |

### 3.4 逻辑链路

#### 3.4.1 初始化链路

```
mounted / activated（两钩子逻辑一致）
  └─ Promise.all([
        loadAuthData(),                       // 权限 + 默认片区
        loadTableData(),                      // 库存列表
        loadPurchaseRequestList('待审批'),     // 审批待办（角标）
        loadPurchaseRequestList('待入库'),     // 入库待办（角标）
        loadPurchaseRequestList('我的上报')    // 驳回重提待办（角标）
     ])
```

#### 3.4.2 库存查询链路（动态片区列 + 预警高亮）

```
queryForm(category/itemName/areaCode) + pagination
  → getSuppliesStockPage → tableData（每行含 areaQtyMap + totalQty）

动态列：
  visibleAreaColumns = 未选片区 → 全部有值片区；选了片区 → 仅该片区
  列取值：row.areaQtyMap[area.value]（回退 areaQtyMap[area.label]）→ 缺省 0

行高亮：getStockRowClassName → row.earlyWarning 为真 → 'is-early-warning'
```

#### 3.4.3 采购申请主链路（三条入口 + 确认提交）

```
入口（三条，最终汇入同一张 purchaseForm.items）
├─ A. 手工添加：openSelectProductDialog
│      → loadProductOptions（getSuppliesItemPage，pageSize 200，label 多字段拼接）
│      → 选择/输入产品（watch itemName 自动带出 itemId/类别/规格/编号/单位/备注）
│      → confirmAddPurchaseItem（动态校验 rules = itemName 必填 + hasAuthAreaRules）
│      → addPurchaseItem（同 itemId 同单价 → 按片区累加；否则 push 新行，含 quantity 合计）
├─ B. 模板导入：见 3.4.4
└─ C. 驳回重提：见 3.4.6（记录 resubmitId）

purchaseForm 校验（applyTime 必填，applicant 默认取登录人）
  → openConfirmPurchaseDialog
      汇总每个产品的六片区数量 → quantity → confirmPurchaseForm
  → confirmPurchaseSubmit
      payload = { applicant, applyTime, remark, detailList, id: resubmitId || '' }
      → submitPurchaseRequest
  → 成功：清空表单/弹窗；resubmitId 有值时 await 刷新"我的上报"并复位 resubmitId
```

#### 3.4.4 模板导入链路（Excel）

```
下载模板：downloadPurchaseTemplate → downloadExportTemplate（blob）→ 采购申请模板.xlsx

导入：triggerPurchaseImport → 隐藏 file input（accept=.xlsx,.xls）
  → handleImportTemplate
      ├─ 文件校验：扩展名 .xlsx/.xls 或 Excel MIME
      ├─ FormData('file') → importPurchaseRequest（服务端解析，前端不做本地解析）
      ├─ 返回 detailList（records/list/rows/records 多字段兜底）+ applyTime/remark/fileList 回填
      └─ normalizeImportedPurchaseItems：
             按 row.areaCode 在 areaList 中找到 key，将 quantity 落到对应片区列，其余片区补 0
  → purchaseImportLoading 控制 loading；finally 中清空 input.value（支持重复导入同一文件）
```

#### 3.4.5 审批链路（片区长 / 总部 payload 差异）

```
openRequestDialog('待审批')
  → loadPurchaseRequestList('待审批')
      ├─ records 按 hasAuth 降序置顶（有权限的单据排前）
      ├─ hasAuthApproveNum 归零后按 hasAuth 条数重新累加（角标）
      └─ item.currentTaskDisplay 决定操作区：
            ├─ '片区长审批'   → areaApprovePurchaseRequest({ id, approveState })
            └─ '总部综管员审批' → 先选 inboundTime（入库时间）
                              → hqApprovePurchaseRequest({ id, inboundTime,
                                  detailList: [{itemId, itemName, unitPrice}], approveState })
  → 成功后重新加载"待审批"
```

#### 3.4.6 驳回重提链路

```
我的上报 Tab（item.currentTask === '采购申请' 即"已驳回"）
  → openResubmitPurchaseDialog(item)
      ├─ resubmitId = item.id
      ├─ applyTime ← item.applyTaskInfo.submitDate（无则保留现值）
      ├─ remark ← item.remark
      └─ items = normalizeResubmitPurchaseItems(item.items)
            beiyiQuantity→northOne、beierQuantity→northTwo、dongQuantity→east、
            zhongQuantity→central、xinanQuantity→southWest、yifengQuantity→yifeng
  → 进入 3.4.3 的同一条采购链路
  → confirmPurchaseSubmit 携带 id = resubmitId
  → 成功后 await loadPurchaseRequestList('我的上报')，复位 resubmitId
```

#### 3.4.7 确认入库链路

```
loadPurchaseRequestList('待入库')
  ├─ 每条 item.items 补默认值：xxInStockQuantity || = xxQuantity（申请数即默认实际入库数）
  ├─ 该 Tab 下单价列可编辑（unitPrice 输入框）
  └─ hasAuth 单据出现"确认入库"，六片区实际数量按 isAreaAuthorized 控制可编辑

confirmInStock(item)
  ├─ 组装 itemInStockParamList（xxInStockQuantity → xxQuantity）
  ├─ 校验：至少一个片区数量 > 0，否则 warning
  └─ requestInStockPurchaseRequest({ id, itemInStockParamList })
  → 成功：刷新"待入库" + loadTableData()（库存台账联动更新）
```

#### 3.4.8 转移链路

```
openTransferDialog(row)
  → 源片区自动选中第一个库存 > 0 的片区（遍历 row.areaQtyMap）
  → 源/目标片区库存实时展示（computed sourceWarehouseStock/targetWarehouseStock
     → getWarehouseStock(row, areaCode)）
confirmTransfer 校验：片区必选、源 ≠ 目标、数量 > 0
  → transferSuppliesStock({ itemId, fromAreaCode, toAreaCode, quantity, remark })
  → 刷新库存列表
```

#### 3.4.9 出库链路

```
openOutboundDialog(row)
  → 出库片区默认 row.areaCode，领用人 rows 初始 1 行（add/remove，至少保留 1 行）
confirmOutbound
  ├─ 过滤有效行（name && quantity）→ recipientList[{recipientName, quantity, purpose}]
  ├─ 校验：出库片区/出库时间必填、至少一条领用人
  └─ outSuppliesStock({ itemId, areaCode, operateTime, recipientList, remark })
  → 刷新库存列表
```

#### 3.4.10 库存详情链路

```
openDetailDialog(row)
  → loadDetailRecords(row.itemName)
      → getProductInOutDetailsPage({ itemName, pageNumber:1, pageSize:20 })
      → detailRecordList（各片区列由 `${area.keyInCN}Quantity` 动态生成）
```

#### 3.4.11 导出链路

```
downloadStockList → exportSuppliesStock(当前 queryForm + 分页)（blob）
  → a.download = '库存明细.xlsx'
```

#### 3.4.12 待办角标统计链路

```
每次 loadPurchaseRequestList(listType)：
  requestList = records.sort((a,b) => b.hasAuth - a.hasAuth)   // 有权限置顶
  对应 listType 的计数先归零，再遍历累加 hasAuth === true 的条数：
    待审批                    → hasAuthApproveNum
    待入库                    → hasAuthInStockNum
    我的上报（currentTask==='采购申请'）→ hasAuthResubmitNum

页头按钮角标：
  审批管理 = approvalManageBadgeCount = hasAuthApproveNum + hasAuthResubmitNum
  入库管理 = hasAuthInStockNum
  （计数 <= 0 时 el-badge 隐藏）
```

### 3.5 采购清单虚拟滚动

采购明细可能因模板导入产生大量行，清单表格采用手写虚拟滚动（非组件库方案）：

```
参数：itemHeight = 48px，visibleCount = 8，bufferCount = 4（上下各缓冲 4 行）

窗口计算（computed）：
  startIndex = max(0, floor(scrollTop / itemHeight) - bufferCount)
  endIndex   = min(items.length, startIndex + visibleCount + bufferCount * 2)
  purchaseVirtualVisibleItems = [{ index, row }]      // index 为 purchaseForm.items 真实下标
  purchaseVirtualOffset      = startIndex * itemHeight // translateY 定位
  purchaseVirtualTotalHeight = items.length * itemHeight // spacer 撑起真实滚动高度

滚动同步：
  body @scroll → 记录 scrollTop → 重算窗口
  外层 @wheel → handlePurchaseVirtualWheel 把 deltaY 转加到 body.scrollTop

删除：removePurchaseItemVirtual(vIdx) → 通过 item.index 映射回真实下标 splice
```

### 3.6 接口清单

| 组件方法 | 接口 | 说明 |
| --- | --- | --- |
| loadAuthData | getMyAuth | 角色 + 授权片区 |
| loadTableData | getSuppliesStockPage | 库存分页查询 |
| downloadStockList | exportSuppliesStock | 库存导出（blob） |
| loadProductOptions | getSuppliesItemPage | 选品下拉数据源 |
| confirmPurchaseSubmit | submitPurchaseRequest | 提交 / 重提采购申请 |
| loadPurchaseRequestList | getPurchaseRequestPage | 三类采购列表（listType 区分） |
| approvePurchaseRequest | areaApprovePurchaseRequest / hqApprovePurchaseRequest | 片区长 / 总部审批 |
| confirmInStock | requestInStockPurchaseRequest | 确认入库 |
| confirmTransfer | transferSuppliesStock | 片区间转移 |
| confirmOutbound | outSuppliesStock | 出库（多领用人） |
| loadDetailRecords | getProductInOutDetailsPage | 详情流水（pageSize 20） |
| handleImportTemplate | importPurchaseRequest | 采购模板导入 |
| downloadPurchaseTemplate | downloadExportTemplate | 采购模板下载（blob） |

### 3.7 注意点

1. `approvePurchaseRequest` 中 loading 使用 `===` 比较（`approvePurchaseRequestLoading === true`），"同意"按钮的 loading 实际不会置位，如需修复应改为赋值；
2. `addPurchaseItem` 的同产品合并判断引用了 `selectProductForm.price`（实际字段为 `unitPrice`），合并分支不会命中，当前总是新增行；
3. `confirmInventory` 依赖的 `hasInventoryData` 未在 data 中定义，"确认入库"提示弹窗当前不可达（入库成功提示以 `$message` 为准）；
4. `requestDialogTitle` 计算属性内部对 `this.requestDialogTitleText` 赋值（未声明属性），依赖该副作用展示标题；
5. `loadPurchaseRequestList` 中 `.then` 与 `.finally` 双重复位 `requestListLoading`（冗余但无害）；
6. `resetQuery` 的默认片区策略与 `loadAuthData` 保持一致（总部回到全部，普通角色回到 `wzqpList[0]`）。

---

## 四、productInOutDetails 出入库明细

### 4.1 功能概览

- 多条件查询：时间范围、片区、物品名称 + 记录类型按钮组（全部/采购入库/出库/转移）；
- 分页列表，展示各片区数量明细列与领用人（多人用 `-` 连接）；
- 按当前条件导出 Excel；
- 单条详情弹窗（基本信息栅格 + 产品明细表）。

### 4.2 核心数据结构

| 字段 | 说明 |
| --- | --- |
| `queryForm` | operationType / itemName / areaCode / timeStart / timeEnd（含内置分页字段） |
| `recordTypeTabs` | 全部记录 / 采购入库 / 出库 / 转移（value 即传给后端的 operationType，`''` 为全部） |
| `tableData` / `pagination` | 流水分页数据（行经 `normalizeRow` 归一化） |
| `detailVisible` / `detailRow` | 详情弹窗 |

### 4.3 逻辑链路

#### 4.3.1 查询链路（buildParams 空值剔除）

```
buildParams()：
  1) 复制 queryForm，operationType 有值才携带
  2) 剔除 '' / null / undefined 的键（空条件不传后端）
  3) 追加 pagination.pageNumber / pageSize

loadTableData → getProductInOutDetailsPage(params)
  → records.map(normalizeRow) → 回写 totalRecord / pageNumber / pageSize

search    → pageNumber = 1 → loadTableData
resetQuery → 清空 queryForm + Tab 复位"全部记录" → loadTableData
handleSizeChange / handleCurrentChange → loadTableData
```

#### 4.3.2 记录类型切换链路

```
setRecordType(tab)
  → queryForm.operationType = tab.value        // '' 即全部
  → recordTypeTabs 重建 active 标记（不可变更新，保证按钮高亮刷新）
  → search()
```

#### 4.3.3 行归一化链路（normalizeRow）

```
normalizeRow(row)：
  recipientList[] → recipientText（recipientName 用 '-' 连接；为空回退 recipientName / recipient）
  operateTime  ← operateTime | operationTime | operateDate | createTime（四级兜底）
  operatorName ← operatorName | operator
  五片区数量字段透传（beiyi / beier / dong / zhong / xinan）

列表与详情弹窗共用同一归一化函数，保证展示口径一致
```

#### 4.3.4 导出 / 详情链路

```
导出：handleExport → exportProductInOutDetails(buildParams())（blob）
      → a.download = '出入库明细.xlsx'

详情：openDetailDialog(row) → normalizeRow(row) → detailRow
      ├─ 基本信息栅格：操作类型 / 时间 / 操作人 / 片区 / 领用人 / 备注
      └─ 单行产品明细表：总数量 = 北一 + 北二 + 东 + 中 + 西南
```

### 4.4 接口清单

| 组件方法 | 接口 | 说明 |
| --- | --- | --- |
| loadTableData | getProductInOutDetailsPage | 出入库流水分页查询 |
| handleExport | exportProductInOutDetails | 流水导出（blob） |

### 4.5 注意点

1. 模板中日期选择器绑定的是 `queryForm.startDate / endDate`，而 data 中定义的是 `timeStart / timeEnd`，时间条件当前不会生效，需统一字段名；
2. 详情弹窗"总数量"求和未包含益丰片区（模板中只累加了五个片区）；
3. `queryForm.itemName` 已参与 `buildParams`，但查询面板暂无对应输入框；
4. 表格首列 selection 列仅作展示，未接勾选逻辑；
5. `mounted` 与 `activated` 均调用 `loadTableData()`，keep-alive 切回会自动刷新。
