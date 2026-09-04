import Vue from 'vue';
import service from '@MA/services/api';
let template = require('./content.html');
require('./index.scss');
const userModel=require('controllers/model/userModel');

let comm = Vue.extend({
    template: template,
    data: function () {
        return {
            queryForm: {
                category: '',
                itemName: '',
                areaCode: ''
            },
            areaList: [
                { label: '全部片区', value: '',key: 'all' },
                { label: '北一片区', value: '北一片区',key: 'northOne',keyInCN : 'beiyi' },
                { label: '北二片区', value: '北二片区',key: 'northTwo',keyInCN : 'beier' },
                { label: '东片区', value: '东片区',key: 'east',keyInCN : 'dong' },
                { label: '中片区', value: '中片区',key: 'central',keyInCN : 'zhong' },
                { label: '西南片区', value: '西南片区',key: 'southWest',keyInCN : 'xinan' },
                { label: '益丰片区', value: '益丰片区',key: 'yifeng',keyInCN : 'yifeng' }
            ],
            tableData: [],
            loading: false,
            pagination: {
                pageNumber: 1,
                pageSize: 10,
                total: 0,
            },
            detailVisible: false,
            detailRow: {},
            detailLoading: false,
            detailRecordsLoading: false,
            detailRecordList: [],
            purchaseVisible: false,
            selectProductVisible: false,
            confirmPurchaseVisible: false,
            purchaseSubmitting: false,
            requestDialogVisible: false,
            requestDialogListType: '待审批',
            requestDialogPagination: {
                pageNumber: 1,
                pageSize: 10,
                total: 0,
            },
            requestList: [],
            requestListLoading: false,
            inventoryConfirmVisible: false,
            approvePurchaseRequestLoading: false,
            refusePurchaseRequestLoading: false,
            currentPurchaseRequest: {},
            confirmInStockLoading: false,
            outboundVisible: false,
            outboundRow: {},
            transferVisible: false,
            transferRow: {},
            transferSubmitting: false,
            transferForm: {
                productName: '',
                productCode: '',
                productType: '',
                spec: '',
                sourceWarehouse:'',
                targetWarehouse:'',
                transferNum: 1,
                remark: ''
            },
            outboundForm: {
                itemName: '',
                itemCode: '',
                itemType: '',
                spec: '',
                outTime: '',
                outWarehouse: '',
                receiver: '',
                rows: []
            },
            outboundSubmitting: false,
            inventoryApplication: {},
            inventoryItems: [],
            purchaseForm: {
                applicant:userModel.getUserInfo().name,
                remark: '',
                applyTime: '',
                items: [],
                fileList: []
            },
            purchaseFormRules: {
                applyTime: [
                    { required: true, message: '请填写申请时间', trigger: 'blur' }
                ]
            },
            purchaseImportFile: null,
            purchaseImportLoading: false,
            selectProductForm: {
                itemName: '',
                unitPrice:'',
                area:{
                    northOne: '',
                    northTwo: '',
                    east: '',       
                    central: '',
                    southWest: '',
                    yifeng: ''
                },
                itemType: '',
                modelSpec: '',
                itemNo: '',
                unit: '',
                remark: '',
                itemId: ''
            },
            confirmPurchaseForm: {
                applyTime: '',
                items: []
            },
            approvalList: [],
            productOptions: [],
            productOptionsLoading: false,
            userAuth: {
                userId: '', 
                roleList: [],
                wzqpList: []
            },
            resubmitId: '',
            hasAuthApproveNum:0,//审批权限数量
            hasAuthInStockNum:0,//入库权限数量
            hasAuthResubmitNum:0,//重新提交权限数量
            purchaseVirtualScroll: {
                itemHeight: 48,
                scrollTop: 0,
                visibleCount: 8,
                bufferCount: 4
            }
        }
    },
    watch: {
        "selectProductForm.itemName": {
            handler: function (newVal) {
                let item=this.productOptions.find(item=>item.itemName===newVal)
                if(item){
                    this.selectProductForm.itemId=item.itemId
                    this.selectProductForm.itemType = item.itemType
                    this.selectProductForm.modelSpec = item.modelSpec
                    this.selectProductForm.itemNo = item.itemNo
                    this.selectProductForm.unit = item.unit
                    this.selectProductForm.remark = item.remark
                }
            }
        }
    },
    computed: {
        requestDialogTitle: function () {
            return this.requestDialogTitleText=this.requestDialogListType === '待审批'||this.requestDialogListType === '我的上报' ? '审批管理' : '入库管理';
        },
        sourceWarehouseStock: function () {
            return this.getWarehouseStock(this.transferRow, this.transferForm.sourceWarehouse);
        },
        targetWarehouseStock: function () {
            return this.getWarehouseStock(this.transferRow, this.transferForm.targetWarehouse);
        },
        visibleAreaColumns: function () {
            if (!this.queryForm.areaCode) {
                return this.areaList.filter(function (area) {
                    return area.value;
                });
            }
            return this.areaList.filter(function (area) {
                return area.value === this.queryForm.areaCode;
            }, this);
        },
        filterAreaList:  function() {
            return this.areaList.filter(function (area) {
                return area.value.length > 0;
            })
        },
        hasAuthAreaList(){
            return this.areaList.filter((item)=>{
                return this.isAreaAuthorized(item.value)
            })  
        },
        hasAuthAreaRules(){
            let ans= this.hasAuthAreaList.reduce((acc,item)=>{
                
                acc[`area.${item.key}`]= [
                    { required: true, message: '请填写数量', trigger: 'blur' }
                ]
                return acc
            },{})
            return ans
        },
        selectProductFormRules(){
            let ans= {
                itemName: [
                    { required: true, message: '请选择或输入产品', trigger: 'change' }
                ]
            }
            Object.assign(ans,this.hasAuthAreaRules)
            return ans       
         },
            approvalManageBadgeCount: function () {
                return (Number(this.hasAuthApproveNum) || 0) + (Number(this.hasAuthResubmitNum) || 0);
            },
            purchaseItemCount: function () {
                return (this.purchaseForm.items || []).length;
            },
            purchaseVirtualTotalHeight: function () {
                return this.purchaseItemCount * this.purchaseVirtualScroll.itemHeight;
            },
            purchaseVirtualVisibleItems: function () {
                var vs = this.purchaseVirtualScroll;
                var startIndex = Math.max(0, Math.floor(vs.scrollTop / vs.itemHeight) - vs.bufferCount);
                var endIndex = Math.min(
                    this.purchaseItemCount,
                    startIndex + vs.visibleCount + vs.bufferCount * 2
                );
                var items = [];
                for (var i = startIndex; i < endIndex; i++) {
                    items.push({
                        index: i,
                        row: this.purchaseForm.items[i]
                    });
                }
                return items;
            },
            purchaseVirtualOffset: function () {
                var vs = this.purchaseVirtualScroll;
                var startIndex = Math.max(0, Math.floor(vs.scrollTop / vs.itemHeight) - vs.bufferCount);
                return startIndex * vs.itemHeight;
            }
    },
    methods: {
        loadAuthData: function () {
            let _this = this;
            return service.getMyAuth({}).then(function (res) {
                let data = res && res.data ? res.data : res || {};
                _this.userAuth = {
                    userId: data.userId || '',
                    roleList: data.roleList || [],
                    wzqpList: data.wzqpList || []
                };
                _this.queryForm.areaCode = _this.userAuth.roleList.indexOf('物资-总部综管员') !== -1 ? '' : _this.userAuth.wzqpList[0] || '';
            }).catch(function () {
                _this.userAuth = {
                    userId: '',
                    roleList: [],
                    wzqpList: []
                };
            })
        },
        isAreaAuthorized: function (areaCode) {
            let authAreas = this.userAuth.wzqpList || [];
            if (!authAreas.length) {
                return false;
            }
            if (authAreas.length === 1) {
                return authAreas[0] === areaCode;
            }
            return areaCode === '益丰片区';
        },
        getEditableAreaCodes: function () {
            let authAreas = this.userAuth.wzqpList || [];
            if (!authAreas.length) {
                return [];
            }
            if (authAreas.length === 1) {
                return authAreas.slice();
            }
            return ['益丰片区'];
        },
        // sortStockRecords: function (records) {
        //     return (records || []).sort(function (a, b) {
        //         return b.earlyWarning - a.earlyWarning;
        //     }, this);
        // },
        loadTableData: function () {
            let params = {
                category: this.queryForm.category,
                itemName: this.queryForm.itemName,
                areaCode: this.queryForm.areaCode,
                pageNumber: this.pagination.pageNumber,
                pageSize: this.pagination.pageSize
            };
            this.loading = true;
            service.getSuppliesStockPage(params).then(res => {
                let data =res && res.data ? res.data : res || {}
                this.tableData = data.records || [];
                this.pagination.total = data.totalRecord || 0;
                this.pagination.pageNumber = data.pageNumber || this.pagination.pageNumber;
                this.pagination.pageSize = data.pageSize || this.pagination.pageSize;
            }).catch(err => {
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error('库存数据加载失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.loading = false;
            });
        },
        search: function () {
            this.pagination.pageNumber = 1;
            this.loadTableData();
        },
        resetQuery: function () {
            if(this.userAuth.roleList.indexOf('物资-总部综管员') !== -1){
                this.queryForm = {
                    category: '',
                    itemName: '',
                    areaCode: '',
                    pageNumber: 1,
                    pageSize: 10
                };
            }else{
                this.queryForm = {
                    category: '',
                    itemName: '',
                    areaCode: this.userAuth.wzqpList[0] || '',
                    pageNumber: 1,
                    pageSize: 10
                };
            }
            this.pagination.pageNumber = 1;
            this.pagination.pageSize = 10;
            this.loadTableData();
        },
        handleSizeChange: function (pageSize) {
            this.pagination.pageSize = pageSize;
            this.pagination.pageNumber = 1;
            this.loadTableData();
        },
        handleCurrentChange: function (pageNumber) {
            this.pagination.pageNumber = pageNumber;
            this.loadTableData();
        },
        loadDetailRecords: function (itemName) {
            let _this = this;
            if (!itemName) {
                this.detailRecordList = [];
                return Promise.resolve();
            }
            this.detailRecordsLoading = true;
            return service.getProductInOutDetailsPage({
                itemName: itemName,
                pageNumber: 1,
                pageSize: 20
            }).then(function (res) {
                let data = res && res.data ? res.data : res || {};
                _this.detailRecordList = data.records || data.list || data.rows || [];
            }).catch(function () {
                _this.detailRecordList = [];
                _this.$message.error('出入库记录加载失败');
            }).then(function () {
                _this.detailRecordsLoading = false;
            });
        },
        openDetailDialog: function (row) {
            this.detailRow = row || {};
            this.detailVisible = true;
            this.loadDetailRecords(this.detailRow.itemName);
        },
        openPurchaseDialog: function () {
            this.purchaseVisible = true;
        },
        openResubmitPurchaseDialog: function (item) {
            this.purchaseVisible = true;
            this.resubmitId = item.id;
            this.purchaseForm.applyTime = item.applyTaskInfo && item.applyTaskInfo.submitDate ? item.applyTaskInfo.submitDate : this.purchaseForm.applyTime;
            this.purchaseForm.remark = item.remark || this.purchaseForm.remark || '';
            this.purchaseForm.items = this.normalizeResubmitPurchaseItems(item);
        },
        triggerPurchaseImport: function () {
            let input = this.$refs.purchaseImportInput;
            if (input) {
                input.value = '';
                input.click();
            }
        },
        downloadPurchaseTemplate:async function () {
         try {    
            let res = await service.downloadExportTemplate();
            this.$message.success('下载成功');
            let a=document.createElement('a');
            a.href=URL.createObjectURL(res.data);
            a.download='采购申请模板.xlsx';
            a.click();
            URL.revokeObjectURL(a.href);
         } catch (error) {
            this.$message.error('下载失败：' + ((error && error.msg) || '请稍后重试'));
         }
        },
        downloadStockList: async function () {
            try {
                let params = {
                    category: this.queryForm.category,
                    itemName: this.queryForm.itemName,
                    areaCode: this.queryForm.areaCode,
                    pageNumber: this.pagination.pageNumber,
                    pageSize: this.pagination.pageSize
                };
                let res = await service.exportSuppliesStock(params);
                let blob = res.data
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = '库存明细.xlsx';
                a.click();
                window.URL.revokeObjectURL(url);
                this.$message.success('导出成功');
            } catch (error) {
                this.$message.error('导出失败：' + ((error && error.msg) || '请稍后重试'));
            }
        },
        // handleImportTemplate: function (event) {
        //     let file = event && event.target && event.target.files ? event.target.files[0] : null;
        //     if (!file||file.type!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        //         return;
        //     }
        //     let _this = this;
        //     let reader = new FileReader();
        //     reader.onload = function (e) {
        //         try {
        //             let  data = e.target.result
        //             let workbook = XLSX.read(data, { type: 'array' });
        //             console.log(workbook);
        //             let sheetName = workbook.SheetNames[0];
        //             if (!sheetName) {
        //                 throw new Error('未找到工作表');
        //             }
        //             let sheet = workbook.Sheets[sheetName];
        //             let rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        //             console.log(rawRows);
                    
        //             _this.purchaseForm.items = _this.normalizePurchaseImportRows(rawRows);
        //             _this.$message.success('模板导入成功');
        //         } catch (error) {
        //             _this.$message.error('导入失败：' + ((error && error.message) || '请检查文件格式'));
        //         }
        //     };
        //     reader.onerror = function () {
        //         _this.$message.error('文件读取失败，请重试');
        //     };
        //     reader.readAsArrayBuffer(file);
        // },
        // normalizePurchaseImportRows: function (rows) {
        //     let _this = this;
        //     return (rows || []).map(function (row) {
        //         return {
        //             itemName:  row['产品名称']|| '',
        //             itemId:  row['产品编号']|| '',
        //             itemType:  row['产品类型']|| '',
        //             itemSpec:       row['产品规格']|| '',
        //             unitPrice:  row['单价']|| '',
        //             northOne:row['北一片区数量']|| '',
        //             northTwo: row['北二片区数量']|| '',
        //             east: row['东片区数量']|| '',
        //             central:  row['中片区数量']|| '',
        //             southWest:  row['西南片区数量']|| '',
        //             yifeng:  row['益丰数量']|| '',
        //             areaCode: row.areaCode || row['片区']|| _this.getEditableAreaCodes()[0] || ''
        //         };
        //     }).filter(function (item) {
        //         return item.itemName || item.itemType || item.itemSpec || item.unitPrice;
        //     });
        // },

        async handleImportTemplate(event) {
            let input = event && event.target ? event.target : null;
            let file = input && input.files ? input.files[0] : null;
            if (!file) {
                return;
            }
            let isExcel = /\.(xlsx|xls)$/i.test(file.name) || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
            if (!isExcel) {
                this.$message.warning('请选择 Excel 文件');
                if (input) {
                    input.value = '';
                }
                return;
            }
            let formData = new FormData();
            formData.append('file', file);
            this.purchaseImportFile = file;
            try {
                this.purchaseImportLoading = true;
                let res = await service.importPurchaseRequest(formData);
                let data = res && res.data ? res.data : res || {};
                let detailList = data.detailList || data.items || data.list || data.rows || data.records || data;
                if (!Array.isArray(detailList)) {
                    detailList = [];
                }
                this.purchaseForm.items = this.normalizeImportedPurchaseItems(detailList);
                if (data.applyTime) {
                    this.purchaseForm.applyTime = data.applyTime;
                }
                if (data.remark) {
                    this.purchaseForm.remark = data.remark;
                }
                if (Array.isArray(data.fileList)) {
                    this.purchaseForm.fileList = data.fileList;
                }
                this.$message.success(data.msg || '模板导入成功');
            } catch (error) {
                this.$message.error('导入失败：' + ((error && error.msg) || (error && error.message) || '请检查文件格式'));
            } finally {
                this.purchaseImportLoading = false;
                if (input) {
                    input.value = '';
                }
            }
        },
        normalizeImportedPurchaseItems: function (rows) {
            let _this = this;
            let list= (rows || []).map(function (row) {
                let temp= {
                    itemName: row.itemName|| '',
                    itemId: row.itemId|| '',
                    itemType: row.itemType|| '',
                    itemSpec: row.itemSpec|| '',
                    unitPrice: row.unitPrice|| 0,
                    northOne: 0,
                    northTwo: 0,
                    east: 0,
                    central: 0,
                    southWest: 0,
                    yifeng: 0,
                    areaCode: row.areaCode || ''
                };
               let areaName= _this.areaList.find(item=>item.value===row.areaCode).key||'';
               if(areaName){
                temp[areaName]= row.quantity||0;
               }
               return temp;
            })
            return list


        },
        normalizeResubmitPurchaseItems: function (row) {
            return row.items.map(function (item) {
                return {
                    itemName: item.itemName || '',
                    itemId: item.itemId || '',
                    itemType: item.itemType || '',
                    itemSpec: item.itemSpec || '',
                    unitPrice: item.unitPrice || 0,
                    northOne: item.beiyiQuantity || item.northOne || 0,
                    northTwo: item.beierQuantity || item.northTwo || 0,
                    east: item.dongQuantity || item.east || 0,
                    central: item.zhongQuantity || item.central || 0,
                    southWest: item.xinanQuantity || item.southWest || 0,
                    yifeng: item.yifengQuantity || item.yifeng || 0,
                    areaCode: row.area || ''
                };
            });
        },
        // downloadPurchaseTemplate: function () {
        //     let header = ['产品名称', '产品编号', '产品类型', '产品规格', '单价', '北一片区数量', '北二片区数量', '东片区数量', '中片区数量', '西南片区数量', '益丰数量', '片区'];
        //     let aoa = [header, ['示例产品', 'P0001', '示例类型', '示例规格', 10, 1, 2, 3, 4, 5, 6, '北一片区']];
        //     let sheet = XLSX.utils.aoa_to_sheet(aoa);
        //     let workbook = XLSX.utils.book_new();
        //     XLSX.utils.book_append_sheet(workbook, sheet, '采购申请模板');
        //     XLSX.writeFile(workbook, '产品采购申请模板.xlsx');
        // },
        loadProductOptions: function () {
            let _this = this;
            this.productOptionsLoading = true;
            return service.getSuppliesItemPage({
                pageNumber: 1,
                pageSize: 200,
                itemName: this.queryForm.itemName || '',
                category: this.queryForm.category || '',
                areaCode: this.queryForm.areaCode || ''
            }).then(function (res) {
                let data = res && res.data ? res.data : res || {};
                let records = data.records || data.list || data.rows || [];
                _this.productOptions = records.map(function (item) {
                    return {
                        label: [item.itemName, item.category, item.modelSpec, item.itemNo].filter(function (value) {
                            return value !== undefined && value !== null && value !== '';
                        }).join(' - '),
                        itemName: item.itemName,
                        itemId: item.id,
                        itemNo: item.itemNo,
                        modelSpec: item.modelSpec,
                        itemType: item.category,
                        unit: item.unit,
                        remark: item.remark,
                    };
                });
            }).catch(function () {
                _this.productOptions = [];
            }).then(function () {
                _this.productOptionsLoading = false;
            });
        },
        openSelectProductDialog: function () {
            this.selectProductVisible = true;
            if (!this.productOptions.length) {
                this.loadProductOptions();
            }
        },
        addPurchaseItem: function () {
            let areaValues = {
                northOne: this.selectProductForm.area.northOne||0,
                northTwo: this.selectProductForm.area.northTwo||0,
                east: this.selectProductForm.area.east||0,
                central: this.selectProductForm.area.central||0,
                southWest: this.selectProductForm.area.southWest||0,
                yifeng: this.selectProductForm.area.yifeng||0,
            };
            let quantity = areaValues.northOne + areaValues.northTwo + areaValues.east + areaValues.central + areaValues.southWest + areaValues.yifeng;
            let areaCode = this.getEditableAreaCodes()[0] || '';
            let currentItem = (this.purchaseForm.items || []).find(function (item) {
                return item.itemId === this.selectProductForm.itemId && String(item.unitPrice) === String(this.selectProductForm.price);
            }, this);
            if (currentItem) {
                if (areaCode === '北一片区') {
                    currentItem.northOne = (Number(currentItem.northOne) || 0) + (Number(areaValues.northOne) || 0);
                } else if (areaCode === '北二片区') {
                    currentItem.northTwo = (Number(currentItem.northTwo) || 0) + (Number(areaValues.northTwo) || 0);
                } else if (areaCode === '东片区') {
                    currentItem.east = (Number(currentItem.east) || 0) + (Number(areaValues.east) || 0);
                } else if (areaCode === '中片区') {
                    currentItem.central = (Number(currentItem.central) || 0) + (Number(areaValues.central) || 0);
                } else if (areaCode === '西南片区') {
                    currentItem.southWest = (Number(currentItem.southWest) || 0) + (Number(areaValues.southWest) || 0);
                } else if (areaCode === '益丰片区') {
                    currentItem.yifeng = (Number(currentItem.yifeng) || 0) + (Number(areaValues.yifeng) || 0);
                }
            } else {
                this.purchaseForm.items.push({
                    itemName: this.selectProductForm.itemName,
                    itemId: this.selectProductForm.itemId,
                    itemType: this.selectProductForm.itemType,
                    itemSpec: this.selectProductForm.modelSpec,
                    unitPrice: this.selectProductForm.unitPrice,
                    northOne: areaValues.northOne,
                    northTwo: areaValues.northTwo,
                    east: areaValues.east,
                    central: areaValues.central,
                    southWest: areaValues.southWest,
                    yifeng: areaValues.yifeng,
                    areaCode: areaCode,
                    quantity: quantity
                });
            }
            this.selectProductVisible = false;
            // this.selectProductForm = {
            //     itemName: '',
            //     unitPrice: 0,
            //     area: {
            //         northOne: '',
            //         northTwo: '',
            //         east: '',
            //         central: '',
            //         southWest: '',
            //         yifeng: ''
            //     },
            //     itemType: '',
            //     modelSpec: '',
            //     itemId: ''
            // };
        },
        confirmAddPurchaseItem: function () {
            let selected = this.productOptions.find(function (item) {
                return item.itemName === this.selectProductForm.itemName;
            }, this);
            this.$refs.selectProductForm.validate((valid)=> {
                if (!valid) {
                    return;
                }
                this.addPurchaseItem();
            })
        },
        removePurchaseItem: function (index) {
            this.purchaseForm.items.splice(index, 1);
        },
        openConfirmPurchaseDialog: function () {
            let _this = this;
            this.$refs.purchaseForm.validate(function (valid) {
                if (!valid) {
                    return;
                }
                _this.confirmPurchaseForm = {
                    applicant: _this.purchaseForm.applicant,
                    remark: _this.purchaseForm.remark,
                    applyTime: _this.purchaseForm.applyTime,
                    items: (_this.purchaseForm.items || []).map(function (item) {
                        let quantity = [item.northOne, item.northTwo, item.east, item.central, item.southWest, item.yifeng].reduce(function (sum, value) {
                            return sum + (Number(value) || 0);
                        }, 0);
                        return {
                            itemName: item.itemName,
                            itemId: item.itemId,
                            itemType: item.itemType,
                            itemSpec: item.itemSpec,
                            unitPrice: +item.unitPrice,
                            quantity: quantity,
                            areaCode: item.areaCode
                        };
                    }),
                };
                _this.purchaseVisible = false;
                _this.confirmPurchaseVisible = true;
            });
        },
        confirmPurchaseSubmit: function () {
            let _this = this;
            if (!this.confirmPurchaseForm.items.length) {
                this.$message.warning('请先添加采购产品');
                return;
            }
            this.purchaseSubmitting = true;
            let payload = {
                applicant: this.confirmPurchaseForm.applicant,
                applyTime: this.confirmPurchaseForm.applyTime,
                remark: this.confirmPurchaseForm.remark,
                detailList: [...this.confirmPurchaseForm.items]||[],
                id: this.resubmitId||''
            };
            service.submitPurchaseRequest(payload).then(async function () {
              _this.resubmitId === ''? _this.$message.success('采购申请提交成功'): _this.$message.success('采购申请重新提交成功');
                _this.confirmPurchaseVisible = false;
                _this.purchaseForm.items = [];
                _this.purchaseForm.remark = '';
                _this.confirmPurchaseForm = {
                    applicant: _this.purchaseForm.applicant,
                    remark: '',
                    applyTime: '',
                    items: []
                };
                if(_this.resubmitId){
                    await _this.loadPurchaseRequestList('我的上报')
                    _this.resubmitId = '';
                }
            }).catch(function (error) {
                _this.$message.error('提交失败：' + ((error && error.msg) || '请稍后重试'));
            }).then(function () {
                _this.purchaseSubmitting = false;
            });
        },
        loadPurchaseRequestList: function (listType) {
            let _this = this;
            let pageInfo = this.requestDialogPagination;
            let params = {
                pageNumber:pageInfo.pageNumber? pageInfo.pageNumber:1,
                pageSize: pageInfo.pageSize? pageInfo.pageSize:10,
                listType: listType
            };
            this.requestListLoading = true;
            return service.getPurchaseRequestPage(params).then(function (res) {
                let data = res && res.data ? res.data : res || {};
                let records = data.records || [];
                _this.requestList = (records || []).slice().sort(function (a, b) {
                    return b.hasAuth - a.hasAuth;
                });//置顶有权限

                //数量重置
                if(listType==='待审批'){
                    _this.hasAuthApproveNum = 0;
                }else if(listType==='待入库'){
                    _this.hasAuthInStockNum = 0;
                }else if(listType==='我的上报'){
                    _this.hasAuthResubmitNum = 0;
                }
                _this.requestList.forEach(function (item) {
                    _this.$set(item,'inboundTime','');
                    if(item.hasAuth){
                        if(listType==='待审批'){
                            _this.hasAuthApproveNum++;
                        }else if(listType==='待入库'){
                            _this.hasAuthInStockNum++;
                        }else if(listType==='我的上报'&&item.currentTask==='采购申请'){
                            _this.hasAuthResubmitNum++;
                        }
                    }//权限判断,更新对应的权限数量

                    if(listType==='待入库'){
                        item.items.forEach(function (item) {
                            item.beiyiInStockQuantity||(item.beiyiInStockQuantity=item.beiyiQuantity);
                            item.beierInStockQuantity||(item.beierInStockQuantity=item.beierQuantity);
                            item.dongInStockQuantity||(item.dongInStockQuantity=item.dongQuantity);
                            item.zhongInStockQuantity||(item.zhongInStockQuantity=item.zhongQuantity);
                            item.xinanInStockQuantity||(item.xinanInStockQuantity=item.xinanQuantity);
                            item.yifengInStockQuantity||(item.yifengInStockQuantity=item.yifengQuantity);
                        });
                    }
                });

                //分页信息更新
                    _this.requestDialogPagination.total = data.totalRecord || 0;
                    _this.requestDialogPagination.pageNumber = data.pageNumber || pageInfo.pageNumber;
                    _this.requestDialogPagination.pageSize = data.pageSize || pageInfo.pageSize;
                
            }).catch(function () {
                _this.requestList = [];
                if(listType==='我的上报'){
                    _this.requestDialogPagination.total = 0;
                }
                _this.$message.error((listType || '采购申请') + '列表加载失败');
            }).then(function () {
                _this.requestListLoading = false;
            }).finally(function () {
                _this.requestListLoading = false;
            });
        },
        resetRequestDialogPagination: function () {
                this.requestDialogPagination.pageNumber = 1;
                this.requestDialogPagination.pageSize = 10;
        },
        openRequestDialog: async function (listType = '待审批') {
            this.requestDialogListType =listType
            this.requestDialogVisible = true;
            this.resetRequestDialogPagination();
            await this.loadPurchaseRequestList(this.requestDialogListType);
        },
        handleRequestDialogTabChange: function (tab) {
            let listType = tab && tab.name ? tab.name : this.requestDialogListType;
            this.resetRequestDialogPagination();
            this.loadPurchaseRequestList(listType);
        },
        // handleRequestDialogSizeChange: function (pageSize) {
        //     this.requestDialogPagination.pageSize = pageSize;
        //     this.requestDialogPagination.pageNumber = 1;
        //     this.loadPurchaseRequestList(this.requestDialogListType, this.requestDialogPagination);
        // },
        handleRequestDialogCurrentChange: function (pageNumber) {
            this.requestDialogPagination.pageNumber = pageNumber;
            this.loadPurchaseRequestList(this.requestDialogListType);
        },
        approvePurchaseRequest: function (item,approveState) {
            this.currentPurchaseRequest = item;
            let _this = this;
            let currentTask=item.currentTask;
            let payload =currentTask==='片区长审批'?{
                id: item.id,
                approveState: approveState?'通过':'不通过',
            }:{
                inboundTime: item.inboundTime,
                detailList:(item.items||[]).map(function (item) {
                    return {
                        itemId: item.itemId,
                        itemName: item.itemName,
                        unitPrice: item.unitPrice,
                    };
                }),
                approveState: approveState?'通过':'不通过',
                id:item.id,
            };
            approveState===true?this.approvePurchaseRequestLoading===true:this.refusePurchaseRequestLoading=true;
            let apiMethod = currentTask === '片区长审批'
                ? service.areaApprovePurchaseRequest
                : service.hqApprovePurchaseRequest;
            apiMethod(payload).then(function () {
                _this.$message.success('审批成功');
                _this.loadPurchaseRequestList('待审批');
            }).catch(function (error) {
                _this.$message.error( '审批失败：' + ((error && error.msg) || '请稍后重试'));
            }).finally(function () {
                approveState===true?_this.approvePurchaseRequestLoading===false:_this.refusePurchaseRequestLoading===false;
                _this.currentPurchaseRequest=null;
            });
        },
        confirmInStock: function (item) {
            let _this = this;
            this.currentPurchaseRequest = item;
            let items = (item.items || []).map(function (row) {
                return {
                    itemId: row.itemId,
                    itemName: row.itemName,
                    itemType: row.itemType,
                    itemSpec: row.itemSpec,
                    unitPrice: Number(row.unitPrice),
                    beiyiQuantity: Number(row.beiyiInStockQuantity),
                    beierQuantity: Number(row.beierInStockQuantity),
                    dongQuantity: Number(row.dongInStockQuantity),
                    zhongQuantity: Number(row.zhongInStockQuantity),
                    xinanQuantity: Number(row.xinanInStockQuantity),
                    yifengQuantity: Number(row.yifengInStockQuantity)
                };
            });
            let hasAnyQuantity = items.some(function (row) {
                return row.beiyiQuantity || row.beierQuantity || row.dongQuantity || row.zhongQuantity || row.xinanQuantity || row.yifengQuantity;
            });
            if (!hasAnyQuantity) {
                _this.$message.warning('请至少填写一个片区的入库数量');
                return;
            }
            let payload = {
                id: item.id,
                itemInStockParamList: items
            };
            this.confirmInStockLoading = true;
            service.requestInStockPurchaseRequest(payload).then(function () {
                _this.$message.success('入库成功');
                _this.loadPurchaseRequestList('待入库');
                _this.loadTableData()
            }).catch(function (error) {
                _this.$message.error('入库失败：' + ((error && error.msg) || '请稍后重试'));
            }).finally(function () {
                _this.confirmInStockLoading = false;
                _this.currentPurchaseRequest = null;
            });
        },
        openOutboundDialog: function (row) {
            this.outboundRow = row;
            this.outboundForm.itemName = row.itemName;
            this.outboundForm.itemCode = row.itemNo;
            this.outboundForm.itemType = row.category;
            this.outboundForm.spec = row.modelSpec;
            this.outboundForm.outWarehouse = row.areaCode || this.outboundForm.outWarehouse;
            this.outboundForm.rows = [{ name: '', quantity: '', purpose: '' }];
            this.outboundForm.outTime = '';
            this.outboundForm.receiver = '';
            this.outboundVisible = true;
        },
        openTransferDialog: function (row) {
            this.transferRow = row || {};
            this.transferForm.productName = this.transferRow.itemName || '';
            this.transferForm.productCode = this.transferRow.itemNo || '';
            this.transferForm.productType = this.transferRow.category || '';
            this.transferForm.spec = this.transferRow.modelSpec || '';
            let areaQtyMap = this.transferRow.areaQtyMap || {};
            let areaKeys = Object.keys(areaQtyMap);
            this.transferForm.sourceWarehouse = areaKeys.find(function (key) {
                return Number(areaQtyMap[key]) > 0;
            }) || areaKeys[0] || '';
            this.transferForm.targetWarehouse = '';
            this.transferForm.transferNum = 1;
            this.transferForm.remark = '';
            this.transferVisible = true;
        },
        confirmTransfer: function () {
            if (!this.transferRow || !this.transferRow.itemId) {
                this.$message.error('未找到可转移的物品信息');
                return;
            }
            if (!this.transferForm.sourceWarehouse) {
                this.$message.error('请选择源片区');
                return;
            }
            if (!this.transferForm.targetWarehouse) {
                this.$message.error('请选择目标片区');
                return;
            }
            if (this.transferForm.sourceWarehouse === this.transferForm.targetWarehouse) {
                this.$message.error('源片区和目标片区不能相同');
                return;
            }
            let transferQuantity = Number(this.transferForm.transferNum);
            if (!transferQuantity || transferQuantity <= 0) {
                this.$message.error('请输入正确的转移数量');
                return;
            }
            let params = {
                itemId: this.transferRow.itemId,
                fromAreaCode: this.transferForm.sourceWarehouse,
                toAreaCode: this.transferForm.targetWarehouse,
                quantity: transferQuantity,
                remark: this.transferForm.remark || ''
            };
            this.transferSubmitting = true;
            service.transferSuppliesStock(params).then(res => {
                let result = res && res.data ? res.data : res || {};
                if (result && result.isSuccess === false) {
                    throw result;
                }
                this.$message.success('转移成功');
                this.transferVisible = false;
                this.loadTableData();
            }).catch(err => {
                this.$message.error('转移失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.transferSubmitting = false;
            });
        },
        confirmInventory: function () {
            if (!this.hasInventoryData) {
                return;
            }
            this.requestDialogVisible = false;
            this.inventoryConfirmVisible = true;
        },
        getWarehouseStock: function (row, areaCode) {
            if (!row || !row.areaQtyMap || !areaCode) {
                return 0;
            }
            return row.areaQtyMap[areaCode] !== undefined ? row.areaQtyMap[areaCode] : 0;
        },
        addOutboundRecipient: function () {
            this.outboundForm.rows.push({ name: '', quantity: 1, purpose: '' });
        },
        removeOutboundRecipient: function (index) {
            if (this.outboundForm.rows.length <= 1) {
                return;
            }
            this.outboundForm.rows.splice(index, 1);
        },
        confirmOutbound: function () {
            let recipients = (this.outboundForm.rows || []).filter(function (item) {
                return item.name && item.quantity;
            }).map(function (item) {
                return {
                    recipientName: item.name,
                    quantity: Number(item.quantity) || 0,
                    purpose: item.purpose || ''
                };
            });
            if (!this.outboundRow || !this.outboundRow.itemId) {
                this.$message.error('未找到可出库的物品信息');
                return;
            }
            if (!this.outboundForm.outWarehouse) {
                this.$message.error('请选择出库片区');
                return;
            }
            if (!this.outboundForm.outTime) {
                this.$message.error('请选择出库时间');
                return;
            }
            if (!recipients.length) {
                this.$message.error('请至少填写一条领用人信息');
                return;
            }
            let params = {
                itemId: this.outboundRow.itemId,
                areaCode: this.outboundForm.outWarehouse,
                operateTime: this.outboundForm.outTime,
                recipientList: recipients,
                remark: this.outboundForm.receiver || ''
            };
            this.outboundSubmitting = true;
            service.outSuppliesStock(params).then(res => {
                let result = res && res.data ? res.data : res || {};
                if (result && result.isSuccess === false) {
                    throw result;
                }
                this.$message.success('出库成功');
                this.outboundVisible = false;
                this.loadTableData();
            }).catch(err => {
                this.$message.error('出库失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.outboundSubmitting = false;
            });
        },
        closeInventoryConfirm: function () {
            this.inventoryConfirmVisible = false;
        },
        getStockRowClassName: function ({ row }) {
            console.log(row.earlyWarning);
            
            return row.earlyWarning ? 'is-early-warning' : '';
        },
        handleAreaChange: function (areaCode) {
            this.queryForm.areaCode = areaCode;
            this.pagination.pageNumber = 1;
            this.loadTableData();
        },
        closePurchaseDialog: function () {
            this.purchaseVisible = false;
            this.purchaseForm = {
                applicant:userModel.getUserInfo().loginName,
                remark: '',
                applyTime: '',
                items: [],
                fileList: []
            };
            this.$nextTick(function () {
                if (this.$refs.purchaseForm) {
                    this.$refs.purchaseForm.clearValidate();
                }
            });
        },
        closeSelectProductDialog: function () {
            this.selectProductVisible = false;
            this.selectProductForm = {
                itemName: '',
                unitPrice: 0,
                area: {
                    northOne: '',
                    northTwo: '',
                    east: '',
                    central: '',
                    southWest: '',
                    yifeng: ''
                },
                itemType: '',
                modelSpec: '',
                itemId: ''
            };
            this.$nextTick(()=>{
                this.$refs.selectProductForm.clearValidate();
            }) 
        },
            handlePurchaseVirtualScroll: function (e) {
                var el = e.target;
                this.purchaseVirtualScroll.scrollTop = el.scrollTop;
            },
            handlePurchaseVirtualWheel: function (e) {
                var wrap = this.$refs.purchaseVirtualBody;
                if (!wrap) return;
                wrap.scrollTop += e.deltaY;
            },
            removePurchaseItemVirtual: function (virtualIndex) {
                var item = this.purchaseVirtualVisibleItems[virtualIndex];
                if (!item) return;
                this.purchaseForm.items.splice(item.index, 1);
            }        
    },
    mounted:async function () {
      await  Promise.all([this.loadAuthData(),
        this.loadTableData(),
        this.loadPurchaseRequestList('待审批'),
        this.loadPurchaseRequestList('待入库'),
        this.loadPurchaseRequestList('我的上报')])
    },
    async activated(){
        await  Promise.all([this.loadAuthData(),
        this.loadTableData(),
        this.loadPurchaseRequestList('待审批'),
        this.loadPurchaseRequestList('待入库'),
        this.loadPurchaseRequestList('我的上报')])
    }
});

module.exports = comm;
