import Vue from 'vue';
import service from '@MA/services/api';
var template = require('./content.html');
require('./index.scss');
const dictModel = require('@IN/model/dictModel');

var comm = Vue.extend({
    template: template,
    data: function () {
        return {
            breadCrumbNavList: [
                {
                    title: '物品管理'
                }
            ],
            dictList:[],//字典列表
            queryForm: {
                itemNo: '',
                itemName: '',
                brand: '',
                modelSpec: ''
            },
            tableData: [],
            loading: false,
            pagination: {
                pageNumber: 1,
                pageSize: 10,
                total: 0
            },
            drawerVisible: false,
            warningVisible: false,
            drawerMode: 'add',
            drawerLoading: false,
            deletingId: null,
            currentRow: {},
            formModel: this.createFormModel(),
            exporting: false,
            importing: false
        }
    },
    methods: {
        loadTableData: function () {
            var params = Object.assign({}, this.queryForm, {
                pageNumber: this.pagination.pageNumber,
                pageSize: this.pagination.pageSize
            });
            this.loading = true;
            service.getSuppliesItemPage(params).then(res => {
                this.tableData = res.records || [];
                this.pagination.total = res.totalRecord || 0;
            }).catch(err => {
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error('物品数据加载失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.loading = false;
            });
        },
        search: function () {
            this.pagination.pageNumber = 1;
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
        createFormModel: function () {
            return {
                itemNo: '',
                itemName: '',
                brand: '',
                modelSpec: '',
                unit: '',
                category: '',
                remark: '',
                warningThreshold: null,
                warningFixedValue: null
            }
        },
        openAddDialog: function () {
            this.drawerMode = 'add';
            this.drawerLoading = false;
            this.currentRow = {};
            this.formModel = this.createFormModel();
            this.drawerVisible = true;
        },
        openDetailDialog: function (row) {
            this.drawerMode = 'edit';
            this.currentRow = row;
            this.formModel = this.createFormModel();
            this.drawerVisible = true;
            this.drawerLoading = true;
            service.getSuppliesItemDetail({ id: row.id }).then(res => {
                this.formModel = Object.assign(this.createFormModel(), res || {});
            }).catch(err => {
                this.drawerVisible = false;
                this.$message.error('物品数据加载失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.drawerLoading = false;
            });
        },
        openWarningDialog: function (row) {
            this.drawerMode = 'edit';
            this.currentRow = row;
            this.formModel = Object.assign(this.createFormModel(), row);
            this.warningVisible = true;
        },
        saveWarningSetting: function () {
            this.submitForm(this.currentRow.id, 'warning');
        },
        deleteItem: function (row) {
            this.$confirm('确定删除物品“' + (row.itemName || row.itemNo || '') + '”吗？删除后无法恢复。', '删除确认', {
                confirmButtonText: '确定删除',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                this.deletingId = row.id;
                return service.deleteSuppliesItem({ id: row.id });
            }).then(() => {
                this.$message.success('删除成功');
                if (this.tableData.length === 1 && this.pagination.pageNumber > 1) {
                    this.pagination.pageNumber -= 1;
                }
                this.loadTableData();
            }).catch(err => {
                if (err !== 'cancel' && err !== 'close') {
                    this.$message.error('删除失败：' + ((err && err.msg) || '请稍后重试'));
                }
            }).then(() => {
                this.deletingId = null;
            });
        },
        handleExport: function () {
            var params = Object.assign({}, this.queryForm, {
                pageNumber: this.pagination.pageNumber,
                pageSize: this.pagination.pageSize
            });
            this.exporting = true;
            
            service.exportSuppliesItem(params).then((res) => {
                this.$message.success('导出成功');
                const blob = res.data
                let url=URL.createObjectURL(blob);      
                let a=document.createElement('a');
                a.href=url;
                a.download='物品数据.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            }).catch(async (err) => {
                this.$message.error('导出失败：' + ((err && err.msg) || '请稍后重试'));
            }).finally(() => {
                this.exporting = false;
            });
        },
        beforeImportUpload: function (file) {
            var xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (file.type !== xlsxMimeType) {
                this.$message.warning('只能导入 XLSX 格式的文件');
                return false;
            }
            return true;
        },
        handleImport: function (uploadRequest) {
            var formData = new FormData();
            formData.append('file', uploadRequest.file);
            this.importing = true;
            service.importSuppliesItem(formData).then(() => {
                this.$message.success('导入成功');
                this.pagination.pageNumber = 1;
                this.loadTableData();
            }).catch(err => {
                this.$message.error('导入失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.importing = false;
            });
        },
        submitForm: function (id=0, source) {
            let params=Object.assign({},this.formModel,{id});
            if (!params.itemNo || !params.itemName) {
                this.$message.warning('请填写物品编号和物品名称');
                return;
            }
            service.saveSuppliesItem(params).then(() => {
                if (source === 'warning') {
                    this.warningVisible = false;
                } else {
                    this.drawerVisible = false;
                }
                this.$message.success(source === 'warning' ? '预警设置保存成功' : (this.drawerMode === 'add' ? '添加成功' : '保存成功'));
                this.loadTableData();
            }).catch(err => {
                this.$message.error('保存失败：' + ((err && err.msg) || '请稍后重试'));
            });
        },
        resetQuery: function () {
            this.queryForm = {
                itemNo: '',
                itemName: '',
                brand: '',
                modelSpec: ''
            };
            this.pagination.pageNumber = 1;
            this.loadTableData();
        },
        // 获取字典
        async getDict() {
            // 获取所属镇街字典
            const customizeSysDict = await dictModel.getCustomizeSysDict({ groupNames: 'itemType' })
            this.dictList = Object.keys(customizeSysDict['itemType']||{});
        },
    },
    mounted: function () {
        Promise.all([this.loadTableData(),this.getDict()])
    }
});

module.exports = comm;
