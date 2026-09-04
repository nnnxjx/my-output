import Vue from 'vue';
import service from '@MA/services/api';
var template = require('./content.html');
require('./index.scss');

var comm = Vue.extend({
    template: template,
    data: function () {
        return {
            queryForm: {
                pageNumber: 1,
                pageSize: 10,
                operationType: '',
                itemName: '',
                areaCode: '',
                timeStart: '',
                timeEnd: ''
            },
            recordTypeTabs: [
                { label: '全部记录', value: '', active: true },
                { label: '采购入库', value: '采购入库', active: false },
                { label: '出库记录', value: '出库', active: false },
                { label: '转移', value: '转移', active: false },
            ],
            tableData: [],
            loading: false,
            pagination: {
                pageNumber: 1,
                pageSize: 10,
                total: 0
            },
            detailVisible: false,
            detailRow: {}
        };
    },
    methods: {
        buildParams: function () {
            var params = Object.assign({}, this.queryForm);
            if (this.queryForm.operationType) {
                params.operationType = this.queryForm.operationType;
            }
            Object.keys(params).forEach(function (key) {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });
            return Object.assign({}, params, {
                pageNumber: this.pagination.pageNumber,
                pageSize: this.pagination.pageSize
            });
        },
        setRecordType: function (tab) {
            this.queryForm.operationType = tab.value;
            this.recordTypeTabs = this.recordTypeTabs.map(function (item) {
                return Object.assign({}, item, { active: item.value === tab.value });
            });
            this.search();
        },
        normalizeRow: function (row) {
            row = row || {};
            var recipientList = row.recipientList;
            var recipientText = '';
            if (Array.isArray(recipientList)&&recipientList.length>0) {
                recipientText = recipientList.map(function (item) {
                        return item.recipientName||''
                }).join('-');
            } 
            return Object.assign({}, row, {
                recipientText: recipientText || row.recipientName || row.recipient || '',
                operateTime: row.operateTime || row.operationTime || row.operateDate || row.createTime || '',
                operatorName: row.operatorName || row.operator || '',
                beiyiQuantity: row.beiyiQuantity,
                beierQuantity: row.beierQuantity,
                dongQuantity: row.dongQuantity,
                zhongQuantity: row.zhongQuantity,
                xinanQuantity: row.xinanQuantity
            });
        },
        loadTableData: function () {
            var params = this.buildParams();
            this.loading = true;
            service.getProductInOutDetailsPage(params).then(res => {
                var data = res && res.data ? res.data : res || {};
                var records = data.records || data.list || data.rows || [];
                this.tableData = records.map(this.normalizeRow);
                this.pagination.total = data.totalRecord ||0;
                this.pagination.pageNumber = data.pageNumber|| this.pagination.pageNumber;
                this.pagination.pageSize = data.pageSize || this.pagination.pageSize;
            }).catch(err => {
                this.tableData = [];
                this.pagination.total = 0;
                this.$message.error('出入库记录加载失败：' + ((err && err.msg) || '请稍后重试'));
            }).then(() => {
                this.loading = false;
            });
        },
        search: function () {
            this.pagination.pageNumber = 1;
            this.loadTableData();
        },
        resetQuery: function () {
            this.queryForm = {
                pageNumber: 1,
                pageSize: 10,
                operationType: '',
                itemName: '',
                areaCode: '',
                timeStart: '',
                timeEnd: ''
            };
            this.recordTypeTabs = this.recordTypeTabs.map(function (item) {
                return Object.assign({}, item, { active: item.value === '' });
            });
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
        handleExport: async function () {
            try {
                var params = this.buildParams();
                var res = await service.exportProductInOutDetails(params);
                var blob = res.data
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = '出入库明细.xlsx';
                a.click();
                URL.revokeObjectURL(url);
                this.$message.success('导出成功');
            } catch (error) {
                this.$message.error('导出失败：' + ((error && error.msg) || '请稍后重试'));
            }
        },
        openDetailDialog: function (row) {
            this.detailRow = this.normalizeRow(row || {});
            this.detailVisible = true;
        },
        closeDetailDialog: function () {
            this.detailVisible = false;
            this.detailRow = {};
        }
    },
    mounted: function () {
        this.loadTableData();
    },
    activated(){
        this.loadTableData()
    }
});

module.exports = comm;
