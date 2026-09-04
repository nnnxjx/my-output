// 登录状态检查
function checkLoginStatus() {
    const user = localStorage.getItem('user');
    if (!user) {
        // 未登录，跳转到登录页面
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 渲染物品管理表格
function renderItemManagementTable(data) {
    const itemTableBodyElement = document.getElementById('itemTableBody');
    
    if (!itemTableBodyElement) {
        return;
    }
    
    itemTableBodyElement.innerHTML = '';
    
    if (data.length === 0) {
        itemTableBodyElement.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">暂无物品数据</td></tr>';
        return;
    }
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.itemName}</td>
            <td>${item.brand || '-'}</td>
            <td>${item.itemModel}</td>
            <td>${item.unit}</td>
            <td>${item.category}</td>
            <td>${item.remark || '-'}</td>
            <td class="action-buttons">
                <button class="action-btn search-btn" onclick="openItemWarningSettingModal(${index})">预警设置</button>
            </td>
            <td class="action-buttons">
                <button class="action-btn detail-btn" onclick="openEditItemModal(${index})">编辑</button>
                <button class="action-btn out-btn" onclick="deleteItem(${index})">删除</button>
            </td>
        `;
        itemTableBodyElement.appendChild(row);
    });
}

// 打开编辑物品模态框
function openEditItemModal(index) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.identity === '总部综管员') {
        const item = itemManagementData[index];
        if (item) {
            editItemIndex.value = index;
            editItemId.value = item.itemId;
            editItemName.value = item.itemName;
            editItemBrand.value = item.brand || '';
            editItemModel.value = item.itemModel;
            editItemUnit.value = item.unit;
            editItemCategory.value = item.category;
            editItemRemark.value = item.remark || '';
            editWarningThreshold.value = item.warningThreshold || '';
            editWarningFixed.value = item.warningFixed !== undefined && item.warningFixed !== null ? item.warningFixed : '';
            
            // 重新绑定关闭按钮事件监听器
            if (closeEditItemModal) {
                closeEditItemModal.onclick = function() {
                    editItemModal.style.display = 'none';
                    editItemForm.reset();
                };
            }
            
            // 重新绑定取消按钮事件监听器
            if (cancelEditItem) {
                cancelEditItem.onclick = function() {
                    editItemModal.style.display = 'none';
                    editItemForm.reset();
                };
            }
            
            editItemModal.style.display = 'block';
        }
    } else {
        alert('只有总部综管员才可以编辑物品！');
    }
}

// 删除物品
function deleteItem(index) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.identity === '总部综管员') {
        if (confirm('确定要删除这个物品吗？')) {
            itemManagementData.splice(index, 1);
            saveItemManagementData();
            renderItemManagementTable(itemManagementData);
            alert('物品删除成功！');
        }
    } else {
        alert('只有总部综管员才可以删除物品！');
    }
}

// 打开物品预警设置模态框
function openItemWarningSettingModal(index) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.identity === '总部综管员') {
        const item = itemManagementData[index];
        if (item) {
            itemWarningIndex.value = index;
            itemWarningName.value = item.itemName;
            itemWarningModel.value = item.itemModel;
            itemWarningThreshold.value = item.warningThreshold || '';
            itemWarningFixed.value = item.warningFixed !== undefined && item.warningFixed !== null ? item.warningFixed : '';
            
            itemWarningSettingModal.style.display = 'block';
        }
    } else {
        alert('只有总部综管员才可以设置预警！');
    }
}

// 处理物品预警设置提交
function handleItemWarningSettingSubmit(e) {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.identity !== '总部综管员') {
        alert('只有总部综管员才可以设置预警！');
        itemWarningSettingModal.style.display = 'none';
        itemWarningSettingForm.reset();
        return;
    }
    
    const index = parseInt(itemWarningIndex.value);
    const item = itemManagementData[index];
    
    item.warningThreshold = parseFloat(itemWarningThreshold.value) || null;
    const fixedValue = itemWarningFixed.value;
    item.warningFixed = fixedValue && fixedValue !== '' ? parseInt(fixedValue) : null;
    
    saveItemManagementData();
    renderItemManagementTable(itemManagementData);
    
    itemWarningSettingModal.style.display = 'none';
    itemWarningSettingForm.reset();
    
    alert('预警设置保存成功！');
}



// 处理编辑物品提交
function handleEditItemSubmit() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.identity !== '总部综管员') {
        alert('只有总部综管员才可以编辑物品！');
        editItemModal.style.display = 'none';
        editItemForm.reset();
        return;
    }
    
    const index = parseInt(editItemIndex.value);
    const updatedItem = {
        itemId: editItemId.value.trim(),
        itemName: editItemName.value.trim(),
        brand: editItemBrand.value.trim(),
        itemModel: editItemModel.value.trim(),
        unit: editItemUnit.value.trim(),
        category: editItemCategory.value.trim(),
        remark: editItemRemark.value.trim(),
        warningThreshold: parseFloat(editWarningThreshold.value) || null,
        warningFixed: (editWarningFixed.value && editWarningFixed.value !== '') ? parseInt(editWarningFixed.value) : null
    };
    
    // 验证必填字段
    if (!updatedItem.itemId || !updatedItem.itemName || !updatedItem.brand || !updatedItem.itemModel || !updatedItem.unit || !updatedItem.category) {
        alert('请填写所有必填字段！');
        return;
    }
    
    // 检查物品编号是否与其他物品重复
    if (itemManagementData.some((item, i) => item.itemId === updatedItem.itemId && i !== index)) {
        alert('物品编号已存在！');
        return;
    }
    
    // 更新物品
    itemManagementData[index] = updatedItem;
    saveItemManagementData();
    renderItemManagementTable(itemManagementData);
    
    // 关闭模态框并重置表单
    editItemModal.style.display = 'none';
    editItemForm.reset();
    
    alert('物品更新成功！');
}

// 处理物品搜索
function handleItemSearch() {
    const itemId = itemIdInput.value.trim().toLowerCase();
    const itemName = itemNameInput.value.trim().toLowerCase();
    const itemBrand = itemBrandInput.value.trim().toLowerCase();
    const itemModel = itemModelInput.value.trim().toLowerCase();
    
    let filteredData = itemManagementData.filter(item => {
        const matchesId = itemId === '' || item.itemId.toLowerCase().includes(itemId);
        const matchesName = itemName === '' || item.itemName.toLowerCase().includes(itemName);
        const matchesBrand = itemBrand === '' || (item.brand && item.brand.toLowerCase().includes(itemBrand));
        const matchesModel = itemModel === '' || item.itemModel.toLowerCase().includes(itemModel);
        
        return matchesId && matchesName && matchesBrand && matchesModel;
    });
    
    renderItemManagementTable(filteredData);
}

// 重置物品搜索
function resetItemSearch() {
    itemIdInput.value = '';
    itemNameInput.value = '';
    itemBrandInput.value = '';
    itemModelInput.value = '';
    
    renderItemManagementTable(itemManagementData);
}

// 从物品管理中获取物品列表（用于采购申请）
function getItemsFromManagement() {
    return itemManagementData;
}

// 打开添加物品模态框
function openAddItemModal() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.identity === '总部综管员') {
        // 清空表单
        addItemForm.reset();
        // 打开模态框
        addItemModal.style.display = 'block';
    } else {
        alert('只有总部综管员才可以添加物品！');
    }
}

// 处理添加物品提交
function handleAddItemSubmit(e) {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.identity !== '总部综管员') {
        alert('只有总部综管员才可以添加物品！');
        addItemModal.style.display = 'none';
        addItemForm.reset();
        return;
    }
    
    const newItem = {
        itemId: addItemId.value.trim(),
        itemName: addItemName.value.trim(),
        brand: addItemBrand.value.trim(),
        itemModel: addItemModel.value.trim(),
        unit: addItemUnit.value.trim(),
        category: addItemCategory.value.trim(),
        remark: addItemRemark.value.trim(),
        warningThreshold: parseFloat(addWarningThreshold.value) || null,
        warningFixed: (addWarningFixed.value && addWarningFixed.value !== '') ? parseInt(addWarningFixed.value) : null
    };
    
    // 验证必填字段
    if (!newItem.itemId || !newItem.itemName || !newItem.brand || !newItem.itemModel || !newItem.unit || !newItem.category) {
        alert('请填写所有必填字段！');
        return;
    }
    
    // 检查物品编号是否与其他物品重复
    if (itemManagementData.some(item => item.itemId === newItem.itemId)) {
        alert('物品编号已存在！');
        return;
    }
    
    // 添加物品
    itemManagementData.push(newItem);
    saveItemManagementData();
    renderItemManagementTable(itemManagementData);
    
    // 关闭模态框并重置表单
    addItemModal.style.display = 'none';
    addItemForm.reset();
    
    alert('物品添加成功！');
}

// 导出物品管理数据
function exportItemManagementData() {
    try {
        // 转换数据格式，使用中文表头
        const exportData = itemManagementData.map(item => {
            return {
                '物品编号': item.itemId,
                '物品名称': item.itemName,
                '品牌': item.brand,
                '型号规格': item.itemModel,
                '单位': item.unit,
                '类别': item.category,
                '备注': item.remark
            };
        });
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, '物品管理数据');
        
        // 导出为Excel文件
        XLSX.writeFile(workbook, 'item_management_data_' + getBeijingTimeISOString().slice(0, 10) + '.xlsx');
        alert('数据导出成功！');
    } catch (error) {
        alert('导出数据失败！');
    }
}

// 导入物品管理数据
function importItemManagementData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // 验证文件类型
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
        alert('导入数据失败：请选择Excel文件（.xlsx或.xls格式）！');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            
            // 尝试读取Excel文件
            let workbook;
            try {
                workbook = XLSX.read(data, { type: 'array' });
            } catch (readError) {
                console.error('读取Excel文件错误:', readError);
                alert('导入数据失败：无法读取Excel文件，请检查文件格式是否正确！');
                return;
            }
            
            if (!workbook) {
                alert('导入数据失败：无法解析Excel文件！');
                return;
            }
            
            if (workbook.SheetNames.length === 0) {
                alert('导入数据失败：Excel文件中没有工作表！');
                return;
            }
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            if (!worksheet) {
                alert('导入数据失败：无法读取工作表数据！');
                return;
            }
            
            let jsonData;
            try {
                jsonData = XLSX.utils.sheet_to_json(worksheet);
            } catch (jsonError) {
                console.error('转换为JSON错误:', jsonError);
                alert('导入数据失败：无法解析工作表数据，请检查数据格式！');
                return;
            }
            
            if (!Array.isArray(jsonData)) {
                alert('导入数据失败：工作表数据格式错误！');
                return;
            }
            
            if (jsonData.length === 0) {
                alert('导入数据失败：工作表中没有数据！');
                return;
            }
            
            // 检查是否包含必要的列
            const firstRow = jsonData[0];
            if (!firstRow) {
                alert('导入数据失败：工作表数据格式错误！');
                return;
            }
            
            if (!firstRow['物品名称'] && !firstRow['itemName']) {
                alert('导入数据失败：工作表中缺少"物品名称"列！');
                return;
            }
            
            // 转换数据格式
            const importedItems = jsonData.map((item, index) => {
                if (!item) return null;
                
                let itemId = item['物品编号'] || item['itemId'] || '';
                // 如果物品编号为空，自动生成
                if (!itemId) {
                    itemId = `ITEM_${Date.now()}_${index + 1}`;
                }
                return {
                    itemId: itemId,
                    itemName: item['物品名称'] || item['itemName'] || '',
                    brand: item['品牌'] || item['brand'] || '',
                    itemModel: item['型号规格'] || item['itemModel'] || item['产品规格'] || '',
                    unit: item['单位'] || item['unit'] || '',
                    category: item['类别'] || item['category'] || '固定资产',
                    remark: item['备注'] || item['remark'] || '',
                    warningThreshold: parseFloat(item['预警阈值']) || parseFloat(item['warningThreshold']) || null,
                    warningFixed: (item['预警值'] !== undefined && item['预警值'] !== null) ? parseInt(item['预警值']) : ((item['warningFixed'] !== undefined && item['warningFixed'] !== null) ? parseInt(item['warningFixed']) : null)
                };
            }).filter(item => item && item.itemName); // 过滤掉无效数据和物品名称为空的数据
            
            if (importedItems.length > 0) {
                itemManagementData = importedItems;
                saveItemManagementData();
                // 直接渲染表格，确保显示最新导入的数据
                renderItemManagementTable(itemManagementData);
                // 更新库存数据的itemId，关联到物品管理
                updateInventoryItemIds();
                // 重新渲染库存表格，确保显示最新的产品编号
                renderInventoryTable(inventoryData);
                alert('数据导入成功！共导入 ' + importedItems.length + ' 条物品数据');
            } else {
                alert('导入的数据格式错误或无有效数据！请确保工作表中包含"物品名称"列，且有非空数据。');
            }
        } catch (error) {
            console.error('导入数据错误:', error);
            alert('导入数据失败，请检查文件格式！错误信息：' + error.message);
        }
    };
    reader.onerror = function(error) {
        console.error('文件读取错误:', error);
        alert('导入数据失败：文件读取错误！');
    };
    reader.readAsArrayBuffer(file);
    // 重置文件输入，允许重复选择同一个文件
    event.target.value = '';
}

// 下载采购申请模板
function downloadPurchaseTemplate() {
    try {
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        
        // 添加采购申请模板工作表
        // 创建带有公式的模板数据
        const templateData = [];
        // 创建10行模板数据，每行都有自动填充功能
        for (let i = 0; i < 10; i++) {
            templateData.push({
                '产品名称': i === 0 ? '请从下拉列表选择' : '',
                '品牌': '',
                '产品规格': '',
                '单位': '',
                '类别': '',
                '单价': '',
                '北二片区数量': 0,
                '东片区数量': 0,
                '中片区数量': 0,
                '西南片区数量': 0
            });
        }
        const templateWorksheet = XLSX.utils.json_to_sheet(templateData);
        
        // 添加VLOOKUP公式，当选择产品名称时自动填充其他信息
        // 注意：Excel公式需要使用英文逗号和函数名
        if (itemManagementData.length > 0) {
            // 设置产品名称列的数据验证（下拉列表）
            // 由于SheetJS库的限制，我们无法直接设置数据验证，但可以在模板中添加说明
            
            // 为每一行添加VLOOKUP公式
            for (let i = 2; i <= 11; i++) { // 从第二行到第11行
                // B列：品牌（索引3）
                templateWorksheet['B' + i] = { t: 'f', f: 'IFERROR(VLOOKUP(A' + i + ', 物品管理列表!$B$2:$G$' + (itemManagementData.length + 1) + ', 2, FALSE), "")' };
                // C列：产品规格（索引4）
                templateWorksheet['C' + i] = { t: 'f', f: 'IFERROR(VLOOKUP(A' + i + ', 物品管理列表!$B$2:$G$' + (itemManagementData.length + 1) + ', 3, FALSE), "")' };
                // D列：单位（索引5）
                templateWorksheet['D' + i] = { t: 'f', f: 'IFERROR(VLOOKUP(A' + i + ', 物品管理列表!$B$2:$G$' + (itemManagementData.length + 1) + ', 4, FALSE), "")' };
                // E列：产品类别（索引6）
                templateWorksheet['E' + i] = { t: 'f', f: 'IFERROR(VLOOKUP(A' + i + ', 物品管理列表!$B$2:$G$' + (itemManagementData.length + 1) + ', 5, FALSE), "")' };
                // F列：单价（需要用户手动输入）
                templateWorksheet['F' + i] = { t: 's', v: '' };
            }
        }
        
        XLSX.utils.book_append_sheet(workbook, templateWorksheet, '采购申请模板');
        
        // 添加物品管理列表工作表
        const itemData = itemManagementData.map(item => {
            return {
                '物品编号': item.itemId,
                '物品名称': item.itemName,
                '品牌': item.brand,
                '型号规格': item.itemModel,
                '单位': item.unit,
                '类别': item.category,
                '备注': item.remark
            };
        });
        const itemWorksheet = XLSX.utils.json_to_sheet(itemData);
        XLSX.utils.book_append_sheet(workbook, itemWorksheet, '物品管理列表');
        
        // 添加说明工作表
        const instructionsData = [
            { '说明': '使用指南' },
            { '步骤': '1. 在"采购申请模板"工作表中，点击产品名称列的单元格，从下拉列表中选择物品' },
            { '步骤': '2. 选择物品后，产品类型、产品规格和单价会自动填充' },
            { '步骤': '3. 填写各片区的采购数量' },
            { '步骤': '4. 可以添加多行采购申请' },
            { '步骤': '5. 填写完成后，保存文件并导入到系统中' },
            { '提示': '"物品管理列表"工作表包含所有现有的物品信息，可用于参考' }
        ];
        const instructionsWorksheet = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, '使用说明');
        
        // 导出为Excel文件
        XLSX.writeFile(workbook, 'purchase_application_template.xlsx');
        alert('模板下载成功！请在Excel中填写采购申请数据，然后导入到系统中。\n\n使用说明：\n1. 在"采购申请模板"工作表中，产品名称列可以从下拉列表选择物品\n2. 选择物品后，产品类型、产品规格会自动填充\n3. "物品管理列表"工作表包含所有现有的物品信息，可用于参考');
    } catch (error) {
        alert('模板下载失败！');
    }
}

// 导入模板数据到采购申请
function importTemplateData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 获取当前登录用户信息
            let user = null;
            try {
                user = JSON.parse(localStorage.getItem('user'));
            } catch (error) {
                alert('用户信息读取失败，请重新登录！');
                return;
            }
            
            if (!user) {
                alert('未找到用户信息，请重新登录！');
                return;
            }
            
            // 验证数据格式
            const validData = jsonData.filter(item => {
                // 检查产品名称
                if (!item['产品名称']) {
                    return false;
                }
                
                // 检查单价（允许0）
                if (item['单价'] === undefined || item['单价'] === null) {
                    return false;
                }
                
                // 检查片区数量
                if (user.identity === '片区综管员' && user.area) {
                    // 片区综管员只需要检查对应片区的数量
                    switch (user.area) {
                        case '北一片区':
                            return item['北一片区数量'] !== undefined;
                        case '北二片区':
                            return item['北二片区数量'] !== undefined;
                        case '东片区':
                            return item['东片区数量'] !== undefined;
                        case '中片区':
                            return item['中片区数量'] !== undefined;
                        case '西南片区':
                            return item['西南片区数量'] !== undefined;
                        case '益丰':
                            return item['益丰数量'] !== undefined;
                        default:
                            return false;
                    }
                } else {
                    // 总部综管员或片区长需要检查至少一个片区的数量
                    return item['北一片区数量'] !== undefined || 
                           item['北二片区数量'] !== undefined || 
                           item['东片区数量'] !== undefined || 
                           item['中片区数量'] !== undefined || 
                           item['西南片区数量'] !== undefined || 
                           item['益丰数量'] !== undefined;
                }
            });
            
            if (validData.length === 0) {
                // 提供更详细的错误信息
                let errorMsg = '导入的数据格式错误或无有效数据！\n';
                errorMsg += '请检查：\n';
                errorMsg += '1. 表格是否包含"产品名称"和"单价"列\n';
                
                if (user.identity === '片区综管员' && user.area) {
                    errorMsg += `2. 表格是否包含"${user.area}数量"列\n`;
                } else {
                    errorMsg += '2. 表格是否包含至少一个片区数量列\n';
                }
                
                alert(errorMsg);
                return;
            }
            
            // 清空现有的产品列表
            const productListBody = document.getElementById('productListBody');
            if (productListBody) {
                productListBody.innerHTML = '';
            }
            
            // 添加导入的产品到采购申请表格
            validData.forEach((item, index) => {
                // 初始化所有片区数量为0
                let totalStock = 0;
                let northStock = 0;
                let centralStock = 0;
                let eastStock = 0;
                let southwestStock = 0;
                let yiFengStock = 0;
                
                // 如果是片区综管员，只读取对应片区的数量
                if (user.identity === '片区综管员' && user.area) {
                    switch (user.area) {
                        case '北一片区':
                            totalStock = Number(item['北一片区数量']) || 0;
                            break;
                        case '北二片区':
                            northStock = Number(item['北二片区数量']) || 0;
                            break;
                        case '东片区':
                            centralStock = Number(item['东片区数量']) || 0;
                            break;
                        case '中片区':
                            eastStock = Number(item['中片区数量']) || 0;
                            break;
                        case '西南片区':
                            southwestStock = Number(item['西南片区数量']) || 0;
                            break;
                        case '益丰':
                            yiFengStock = Number(item['益丰数量']) || 0;
                            break;
                    }
                } else {
                    // 总部综管员或片区长可以读取所有片区的数量
                    totalStock = Number(item['北一片区数量']) || 0;
                    northStock = Number(item['北二片区数量']) || 0;
                    centralStock = Number(item['东片区数量']) || 0;
                    eastStock = Number(item['中片区数量']) || 0;
                    southwestStock = Number(item['西南片区数量']) || 0;
                    yiFengStock = Number(item['益丰数量']) || 0;
                }
                
                // 确保单价是数字
                const price = Number(item['单价']) || 0;
                
                addProductRowWithData({
                    productName: item['产品名称'],
                    productType: item['类别'] || item['产品类别'] || item['产品类型'] || '其他',
                    productSpec: item['产品规格'] || item['型号规格'] || '标准',
                    price: price,
                    totalStock: totalStock,
                    northStock: northStock,
                    centralStock: centralStock,
                    eastStock: eastStock,
                    southwestStock: southwestStock,
                    yiFengStock: yiFengStock
                });
            });
            
            alert('模板数据导入成功！共导入 ' + validData.length + ' 条采购申请数据');
        } catch (error) {
            alert('导入数据失败，请检查文件格式！错误信息：' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
    // 重置文件输入，允许重复选择同一个文件
    event.target.value = '';
}

// 页面加载时检查登录状态
if (!checkLoginStatus()) {
    // 未登录，后续代码不会执行
}

// 检查是否有审批工单并更新红点提示
function checkApprovalRequests() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 根据用户身份筛选待审批的申请
    let pendingApplications = [];
    
    if (user.identity === '片区长') {
        // 片区长只能审批本片区的申请
        pendingApplications = purchaseApplications.filter(application => 
            application.status === APPROVAL_STATUS.PENDING && 
            application.area === user.area
        );
    } else if (user.identity === '总部综管员') {
        // 总部综管员可以审批所有已通过片区长审批的申请
        pendingApplications = purchaseApplications.filter(application => 
            application.status === APPROVAL_STATUS.AREA_MANAGER_APPROVED
        );
    }
    
    // 更新红点提示
    const approvalBadge = document.getElementById('approvalBadge');
    if (approvalBadge) {
        if (pendingApplications.length > 0) {
            approvalBadge.style.display = 'flex';
        } else {
            approvalBadge.style.display = 'none';
        }
    }
}

// 出入库记录数据结构
let stockHistory = [];

// 采购申请数据结构
let purchaseApplications = [];

// 物品管理数据结构
let itemManagementData = [];



// 审批状态常量
const APPROVAL_STATUS = {
    PENDING: 'pending',      // 待审批（片区综管员提交后）
    AREA_MANAGER_APPROVED: 'area_manager_approved', // 片区长已批准
    HEADQUARTERS_APPROVED: 'headquarters_approved', // 总部综管员已批准（待入库）
    AREA_MANAGER_REJECTED: 'area_manager_rejected', // 片区长已拒绝
    HEADQUARTERS_REJECTED: 'headquarters_rejected', // 总部综管员已拒绝
    COMPLETED: 'completed'   // 已完成采购入库
};

// 当前记录类型筛选状态
let currentRecordTypeFilter = 'all';

// 加载出入库记录
function loadStockHistory() {
    // 从本地存储加载出入库记录
    const storedHistory = localStorage.getItem('stockHistory');
    if (storedHistory) {
        try {
            stockHistory = JSON.parse(storedHistory);
        } catch (error) {
            // 如果解析失败，使用空数组
            stockHistory = [];
        }
    } else {
        // 如果本地存储没有数据，使用空数组
        stockHistory = [];
    }
}

// 保存出入库记录
function saveStockHistory() {
    localStorage.setItem('stockHistory', JSON.stringify(stockHistory));
}



// 保存库存数据到本地存储（不再自动下载CSV文件）
function saveInventoryData() {
    // 1. 保存到本地存储（确保页面刷新后数据不丢失）
    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
    
    // 2. 构建CSV内容（用于文件下载备份）
    let csvContent = "productName,productType,productSpec,totalStock,northStock,centralStock,eastStock,southwestStock,yiFengStock,averagePrice,priceHistory,detail,warningThreshold,warningFixedValue,warningRefTotal\n";
    
    // 遍历库存数据
    inventoryData.forEach(item => {
        // 准备各字段值
        const productName = escapeCSVField(item.productName);
        const productType = escapeCSVField(item.productType);
        const productSpec = escapeCSVField(item.productSpec);
        const totalStock = item.totalStock || 0;
        const northStock = item.northStock || 0;
        const centralStock = item.centralStock || 0;
        const eastStock = item.eastStock || 0;
        const southwestStock = item.southwestStock || 0;
        const yiFengStock = item.yiFengStock || 0;
        const averagePrice = item.averagePrice || 0;
        const priceHistory = escapeCSVField(JSON.stringify(item.priceHistory || []));
        const detail = escapeCSVField(JSON.stringify(item.detail || {}));
        const warningThreshold = item.warningThreshold !== undefined && item.warningThreshold !== null ? item.warningThreshold : '';
        const warningFixedValue = item.warningFixedValue !== undefined && item.warningFixedValue !== null ? item.warningFixedValue : '';
        const warningRefTotal = item.warningRefTotal !== undefined && item.warningRefTotal !== null ? item.warningRefTotal : '';
        
        // 构建CSV行
        const csvRow = `${productName},${productType},${productSpec},${totalStock},${northStock},${centralStock},${eastStock},${southwestStock},${yiFengStock},${averagePrice},${priceHistory},${detail},${warningThreshold},${warningFixedValue},${warningRefTotal}`;
        
        // 添加到CSV内容
        csvContent += csvRow + "\n";
    });
    
    // 3. 不再自动下载CSV文件，只在需要时手动备份
}

// 加载物品管理数据
function loadItemManagementData() {
    try {
        // 从localStorage加载物品管理数据
        const storedItems = localStorage.getItem('itemManagementData');
        if (storedItems) {
            itemManagementData = JSON.parse(storedItems);
        } else {
            // 如果localStorage中没有数据，使用空数组
            itemManagementData = [];
        }
        
        // 渲染物品表格
        renderItemManagementTable(itemManagementData);
        
        // 更新库存数据的itemId，关联到物品管理
        updateInventoryItemIds();
        // 重新渲染库存表格，确保显示最新的产品编号
        renderInventoryTable(inventoryData);
    } catch (error) {
        // 如果加载失败，使用空数据
        itemManagementData = [];
        renderItemManagementTable(itemManagementData);
    }
}

// 保存物品管理数据
function saveItemManagementData() {
    try {
        localStorage.setItem('itemManagementData', JSON.stringify(itemManagementData));
    } catch (error) {
        alert('保存数据失败，请检查浏览器设置！');
    }
}

// 导出库存数据为Excel文件
function exportInventoryData() {
    try {
        // 获取所有选中的复选框
        const checkboxes = document.querySelectorAll('.inventory-checkbox:checked');
        
        if (checkboxes.length === 0) {
            alert('请先选择要导出的库存记录！');
            return;
        }
        
        // 检查是否正在进行历史库存查询
        const historyStartDate = document.getElementById('historyStartDate').value;
        const historyEndDate = document.getElementById('historyEndDate').value;
        
        let exportData = [];
        
        if (historyStartDate && historyEndDate) {
            // 导出查询时间段的库存
            const historicalInventory = calculateHistoricalInventory(historyStartDate, historyEndDate);
            
            // 只导出选中的记录
            exportData = Array.from(checkboxes).map(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                const item = historicalInventory[index];
                if (item) {
                    return {
                        '产品编号': item.itemId || '',
                        '产品名称': item.productName,
                        '产品类别': item.productCategory || item.productType || '',
                        '产品规格': item.productSpec,
                        '北一片区': item.totalStock || 0,
                        '北二片区': item.northStock || 0,
                        '东片区': item.centralStock || 0,
                        '中片区': item.eastStock || 0,
                        '西南片区': item.southwestStock || 0,
                        '平均单价': item.averagePrice || 0,
                        '查询时间段': historyStartDate + ' 至 ' + historyEndDate
                    };
                }
                return null;
            }).filter(item => item !== null);
        } else {
            // 导出当前库存
            exportData = Array.from(checkboxes).map(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                const item = inventoryData[index];
                return {
                    '产品编号': item.itemId || '',
                    '产品名称': item.productName,
                    '产品类别': item.productCategory || item.productType || '',
                    '产品规格': item.productSpec,
                    '北一片区': item.totalStock || 0,
                    '北二片区': item.northStock || 0,
                    '东片区': item.centralStock || 0,
                    '中片区': item.eastStock || 0,
                    '西南片区': item.southwestStock || 0,
                    '平均单价': item.averagePrice || 0,
                    '导出时间': getBeijingTimeISOString().slice(0, 10)
                };
            });
        }
        
        if (exportData.length === 0) {
            alert('没有可导出的库存数据！');
            return;
        }
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, '库存数据');
        
        // 导出为Excel文件
        const fileName = historyStartDate && historyEndDate 
            ? 'inventory_data_' + historyStartDate + '_to_' + historyEndDate + '.xlsx'
            : 'inventory_data_' + getBeijingTimeISOString().slice(0, 10) + '.xlsx';
        XLSX.writeFile(workbook, fileName);
        alert('库存数据导出成功！共导出 ' + exportData.length + ' 条记录');
    } catch (error) {
        console.error('导出库存数据错误:', error);
        alert('导出库存数据失败！');
    }
}

// 全选/取消全选库存记录
function toggleSelectAllInventory() {
    const selectAllCheckbox = document.getElementById('selectAllInventory');
    const checkboxes = document.querySelectorAll('.inventory-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// 导出采购申请
function handleExportPurchase() {
    // 获取筛选条件
    const startDate = document.getElementById('purchaseStartDate').value;
    const endDate = document.getElementById('purchaseEndDate').value;
    const areaFilter = document.getElementById('purchaseAreaFilter').value;
    const statusFilter = document.getElementById('purchaseStatusFilter').value;
    
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 筛选采购申请
    let filteredApplications = [...purchaseApplications];
    
    // 按时间筛选
    if (startDate) {
        const startDateTime = new Date(startDate).toISOString();
        filteredApplications = filteredApplications.filter(app => 
            new Date(app.applyDate) >= new Date(startDateTime)
        );
    }
    
    if (endDate) {
        const endDateTime = new Date(endDate).toISOString();
        filteredApplications = filteredApplications.filter(app => 
            new Date(app.applyDate) <= new Date(endDateTime)
        );
    }
    
    // 按片区筛选
    if (areaFilter !== 'all') {
        filteredApplications = filteredApplications.filter(app => 
            app.area === areaFilter
        );
    }
    
    // 按状态筛选
    if (statusFilter !== 'all') {
        filteredApplications = filteredApplications.filter(app => 
            app.status === statusFilter
        );
    }
    
    // 如果没有数据
    if (filteredApplications.length === 0) {
        alert('没有符合条件的采购申请数据！');
        return;
    }
    
    // 准备导出数据
    let exportData = [];
    
    // 添加表头
    exportData.push([
        '申请编号',
        '申请人',
        '申请片区',
        '申请时间',
        '入库时间',
        '状态',
        '产品名称',
        '产品类型',
        '产品规格',
        '单价',
        '北一片区数量',
        '北二片区数量',
        '东片区数量',
        '中片区数量',
        '西南片区数量',
        '益丰数量'
    ]);
    
    // 获取状态文本
    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '待审批';
            case 'area_manager_approved': return '片区长已批准';
            case 'headquarters_approved': return '总部已批准（待入库）';
            case 'completed': return '已完成';
            case 'area_manager_rejected': return '片区长已拒绝';
            case 'headquarters_rejected': return '总部已拒绝';
            default: return status;
        }
    };
    
    // 添加数据行
    filteredApplications.forEach(app => {
        app.products.forEach(product => {
            exportData.push([
                app.purchaseId,
                app.operator,
                app.area,
                formatDateTime(app.applyDate),
                app.inStockTime ? formatDateTime(app.inStockTime) : '',
                getStatusText(app.status),
                product.productName,
                product.productType,
                product.productSpec,
                parseFloat(product.price) ? `¥${parseFloat(product.price).toFixed(2)}` : '',
                product.totalStock || 0,
                product.northStock || 0,
                product.eastStock || 0,
                product.centralStock || 0,
                product.southwestStock || 0,
                product.yiFengStock || 0
            ]);
        });
    });
    
    // 生成CSV文件
    const csvContent = exportData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // 设置文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `采购申请清单_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 关闭模态框
    exportPurchaseModal.style.display = 'none';
    exportPurchaseForm.reset();
    
    alert('采购申请清单导出成功！');
}

// 检查库存预警并显示弹窗
function checkInventoryWarnings() {
    const warningItems = [];
    
    inventoryData.forEach(item => {
        // 检查每个片区的预警
        const checkAreaWarning = (areaName, currentStock, fixedValue, threshold, refValue) => {
            if (fixedValue !== undefined && fixedValue !== null) {
                if (currentStock <= fixedValue) {
                    return { areaName, currentStock, warningValue: fixedValue, type: 'fixed' };
                }
            } else if (threshold !== undefined && threshold !== null && refValue !== undefined && refValue !== null && refValue > 0) {
                const warningValue = refValue * (threshold / 100);
                if (currentStock <= warningValue) {
                    return { areaName, currentStock, warningValue: warningValue, type: 'percentage', threshold, refValue };
                }
            }
            return null;
        };
        
        // 检查各个片区
        const warnings = [];
        const northFirstWarn = checkAreaWarning('北一片区', item.totalStock || 0, item.warningNorthFirstFixed, item.warningNorthFirstThreshold, item.warningNorthFirstRef);
        const northWarn = checkAreaWarning('北二片区', item.northStock || 0, item.warningNorthFixed, item.warningNorthThreshold, item.warningNorthRef);
        const eastWarn = checkAreaWarning('东片区', item.eastStock || 0, item.warningEastFixed, item.warningEastThreshold, item.warningEastRef);
        const centralWarn = checkAreaWarning('中片区', item.centralStock || 0, item.warningCentralFixed, item.warningCentralThreshold, item.warningCentralRef);
        const southwestWarn = checkAreaWarning('西南片区', item.southwestStock || 0, item.warningSouthwestFixed, item.warningSouthwestThreshold, item.warningSouthwestRef);
        const yiFengWarn = checkAreaWarning('益丰', item.yiFengStock || 0, item.warningYiFengFixed, item.warningYiFengThreshold, item.warningYiFengRef);
        
        if (northFirstWarn) warnings.push(northFirstWarn);
        if (northWarn) warnings.push(northWarn);
        if (eastWarn) warnings.push(eastWarn);
        if (centralWarn) warnings.push(centralWarn);
        if (southwestWarn) warnings.push(southwestWarn);
        if (yiFengWarn) warnings.push(yiFengWarn);
        
        if (warnings.length > 0) {
            warningItems.push({
                productName: item.productName,
                productSpec: item.productSpec,
                warnings: warnings
            });
        }
    });
    
    // 如果有预警，显示弹窗
    if (warningItems.length > 0) {
        showWarningAlert(warningItems);
    }
}

// 显示预警提醒弹窗
function showWarningAlert(warningItems) {
    let content = '<ul style="list-style: none; padding: 0; margin: 0;">';
    
    warningItems.forEach(item => {
        content += `<li style="margin-bottom: 15px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">`;
        content += `<strong>${item.productName}</strong>`;
        if (item.productSpec) {
            content += ` (${item.productSpec})`;
        }
        content += '<ul style="margin-top: 8px; padding-left: 20px;">';
        
        item.warnings.forEach(warn => {
            content += `<li style="margin-bottom: 4px;">${warn.areaName}：现有库存 ${warn.currentStock}，预警值 ${Math.round(warn.warningValue)}</li>`;
        });
        
        content += '</ul></li>';
    });
    
    content += '</ul>';
    
    document.getElementById('warningAlertContent').innerHTML = content;
    document.getElementById('warningAlertModal').style.display = 'block';
}

// 全选/取消全选出入库记录
function toggleSelectAllStockHistory() {
    const selectAllCheckbox = document.getElementById('selectAllStockHistory');
    const checkboxes = document.querySelectorAll('.stock-history-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// 导出出入库记录
function exportStockHistory() {
    try {
        // 获取所有选中的复选框
        const checkboxes = document.querySelectorAll('.stock-history-checkbox:checked');
        
        if (checkboxes.length === 0) {
            alert('请先选择要导出的记录！');
            return;
        }
        
        // 获取筛选后的记录数据
        let filteredRecords = stockHistory;
        if (currentRecordTypeFilter === 'purchase') {
            filteredRecords = stockHistory.filter(record => record.operationType === '采购入库');
        } else if (currentRecordTypeFilter === 'out') {
            filteredRecords = stockHistory.filter(record => record.operationType === '出库');
        }
        
        // 按时间倒序排序
        const sortedRecords = filteredRecords
            .sort((a, b) => new Date(b.operationTime) - new Date(a.operationTime));
        
        // 准备导出数据
        let exportData = [];
        
        // 处理选中的记录
        Array.from(checkboxes).forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            const record = sortedRecords[index];
            if (record) {
                // 确定采购涉及的片区
                let areas = [];
                
                // 如果记录包含多个产品，统计所有产品涉及的片区
                if (record.products && record.products.length > 0) {
                    record.products.forEach(product => {
                        // 出库记录使用负数表示，所以需要检查绝对值是否大于0
                        if (Math.abs(product.northStock) > 0 && !areas.includes('北二片区')) areas.push('北二片区');
                        if (Math.abs(product.centralStock) > 0 && !areas.includes('东片区')) areas.push('东片区');
                        if (Math.abs(product.eastStock) > 0 && !areas.includes('中片区')) areas.push('中片区');
                        if (Math.abs(product.southwestStock) > 0 && !areas.includes('西南片区')) areas.push('西南片区');
                    });
                } else {
                    // 兼容旧的数据结构，检查绝对值是否大于0
                    if (Math.abs(record.northStock) > 0) areas.push('北二片区');
                    if (Math.abs(record.centralStock) > 0) areas.push('东片区');
                    if (Math.abs(record.eastStock) > 0) areas.push('中片区');
                    if (Math.abs(record.southwestStock) > 0) areas.push('西南片区');
                }
                
                const areaText = areas.join('、') || '未知片区';
                
                // 构建领用人信息
                let recipientsText = '';
                if (record.operationType === '出库' && record.recipients && record.recipients.length > 0) {
                    recipientsText = record.recipients.map(recipient => `${recipient.name}(${recipient.quantity})`).join('; ');
                }
                
                // 如果记录包含多个产品，为每个产品创建一条记录
                if (record.products && record.products.length > 0) {
                    record.products.forEach(product => {
                        exportData.push({
                            '片区': areaText,
                            '操作类型': record.operationType,
                            '操作时间': formatDateTime(record.operationTime),
                            '操作人': record.operator,
                            '产品名称': product.productName,
                            '产品规格': product.productSpec,
                            '单价': product.price || record.price || 0,
                            '北二片区数量': product.northStock || 0,
                            '东片区数量': product.centralStock || 0,
                            '中片区数量': product.eastStock || 0,
                            '西南片区数量': product.southwestStock || 0,
                            '领用人': recipientsText,
                            '备注': record.remark || ''
                        });
                    });
                } else {
                    // 兼容旧的数据结构
                    exportData.push({
                        '片区': areaText,
                        '操作类型': record.operationType,
                        '操作时间': formatDateTime(record.operationTime),
                        '操作人': record.operator,
                        '产品名称': record.productName || '',
                        '产品规格': record.productSpec || '',
                        '单价': record.price || 0,
                        '北一片区数量': record.totalStock || 0,
                        '北二片区数量': record.northStock || 0,
                        '东片区数量': record.centralStock || 0,
                        '中片区数量': record.eastStock || 0,
                        '西南片区数量': record.southwestStock || 0,
                        '领用人': recipientsText,
                        '备注': record.remark || ''
                    });
                }
            }
        });
        
        if (exportData.length === 0) {
            alert('没有可导出的记录！');
            return;
        }
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, '出入库记录');
        
        // 导出为Excel文件
        const fileName = 'stock_history_export_' + getBeijingTimeISOString().slice(0, 10) + '.xlsx';
        XLSX.writeFile(workbook, fileName);
        alert('导出成功！共导出 ' + exportData.length + ' 条记录');
    } catch (error) {
        console.error('导出出入库记录错误:', error);
        alert('导出失败！');
    }
}

// 转义CSV字段，处理包含逗号、引号等特殊字符的情况
function escapeCSVField(field) {
    if (typeof field !== 'string') {
        field = String(field);
    }
    
    // 如果字段包含逗号、引号或换行符，需要用引号包围
    if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
        // 替换字段中的引号为两个引号
        field = field.replace(/"/g, '""');
        // 用引号包围字段
        field = `"${field}"`;
    }
    
    return field;
}

// 保存文件
function saveFile(filename, content) {
    // 创建Blob对象
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    
    // 检查是否支持download属性
    if (link.download !== undefined) {
        // 支持download属性的浏览器
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 库存数据 - 从CSV文件读取
let inventoryData = [];



// 更新库存数据，将产品与物品管理的itemId关联
function updateInventoryItemIds() {
    inventoryData.forEach(item => {
        const itemInfo = itemManagementData.find(imItem => 
            imItem.itemName === item.productName && 
            imItem.itemModel === item.productSpec
        );
        if (itemInfo) {
            item.itemId = itemInfo.itemId;
            item.productCategory = itemInfo.category;
        }
    });
    // 保存更新后的库存数据
    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
}

// 加载库存数据（优先从本地存储加载）
function loadInventoryData() {
    // 先尝试从本地存储加载库存数据
    const storedInventory = localStorage.getItem('inventoryData');
    if (storedInventory) {
        try {
            inventoryData = JSON.parse(storedInventory);
            
            // 更新库存数据的itemId，关联到物品管理
            updateInventoryItemIds();
            
            // 重新渲染库存表格
            renderInventoryTable(inventoryData);
            
            // 检查库存预警
            setTimeout(checkInventoryWarnings, 500);
            return;
        } catch (error) {
        }
    }
    
    // 如果本地存储加载失败，从CSV文件读取
    fetch('inventory_data.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法读取库存数据文件');
            }
            return response.text();
        })
        .then(csvData => {
            // 解析CSV数据
            const data = parseInventoryCSV(csvData);
            inventoryData = data;
            
            // 更新本地存储
            localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
            
            // 重新渲染库存表格
            renderInventoryTable(inventoryData);
            
            // 检查库存预警
            setTimeout(checkInventoryWarnings, 500);
        })
        .catch(error => {
            // 如果加载失败，使用默认数据
            useDefaultInventoryData();
        });
}

// 解析库存CSV数据
function parseInventoryCSV(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        // 处理包含逗号的字段（如detail字段）
        const values = parseCSVLine(lines[i]);
        const item = {};
        
        headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // 转换数值类型
            if (['totalStock', 'northStock', 'centralStock', 'eastStock', 'southwestStock', 'averagePrice'].includes(header)) {
                item[header] = parseFloat(value) || 0;
            } 
            // 解析JSON格式的detail字段
            else if (header === 'detail' && value) {
                try {
                    item[header] = JSON.parse(value);
                } catch (e) {
                    item[header] = {};
                }
            } 
            // 解析priceHistory字段
            else if (header === 'priceHistory' && value) {
                try {
                    item[header] = JSON.parse(value);
                } catch (e) {
                    item[header] = [];
                }
            } else {
                item[header] = value;
            }
        });
        
        data.push(item);
    }
    
    return data;
}

// 解析CSV行，处理包含逗号的字段
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue.trim());
    return values;
}

// 使用默认库存数据（当CSV文件加载失败时）
function useDefaultInventoryData() {
    // 如果inventoryData为空，使用空数组
    if (!inventoryData || inventoryData.length === 0) {
        inventoryData = [];
    }
    renderInventoryTable(inventoryData);
}

// DOM元素
const productTypeInput = document.getElementById('productTypeInput');
const productNameInput = document.getElementById('productNameInput');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const purchaseApplyBtn = document.getElementById('purchaseApplyBtn');
const inventoryTableBody = document.getElementById('inventoryTableBody');
const userDisplayNameSidebar = document.getElementById('userDisplayNameSidebar');
const logoutBtn = document.getElementById('logoutBtn');

// 模态框相关DOM元素
// 采购申请模态框
const purchaseApplyModal = document.getElementById('purchaseApplyModal');
const closePurchaseApplyModal = document.getElementById('closePurchaseApplyModal');
const cancelPurchaseApply = document.getElementById('cancelPurchaseApply');
const purchaseApplyForm = document.getElementById('purchaseApplyForm');
const addExistingProductBtn = document.getElementById('addExistingProductBtn');
const productListBody = document.getElementById('productListBody');
const applyOperator = document.getElementById('applyOperator');
const applyDate = document.getElementById('applyDate');

// 审批管理模态框
const approvalManageModal = document.getElementById('approvalManageModal');
const closeApprovalManageModal = document.getElementById('closeApprovalManageModal');
let approvalList = document.getElementById('approvalList');
const approvalManageBtn = document.getElementById('approvalManageBtn');
const inStockBtn = document.getElementById('inStockBtn');

// 入库管理模态框相关
const inStockModal = document.getElementById('inStockModal');
const closeInStockModal = document.getElementById('closeInStockModal');
let inStockList = document.getElementById('inStockList');

// 导出采购申请模态框相关
const exportPurchaseModal = document.getElementById('exportPurchaseModal');
const closeExportPurchaseModal = document.getElementById('closeExportPurchaseModal');
const exportPurchaseBtn = document.getElementById('exportPurchaseBtn');
const exportPurchaseForm = document.getElementById('exportPurchaseForm');
const cancelExportPurchase = document.getElementById('cancelExportPurchase');

// 库存转移模态框相关
const transferStockModal = document.getElementById('transferStockModal');
const closeTransferStockModal = document.getElementById('closeTransferStockModal');
const transferStockForm = document.getElementById('transferStockForm');
const cancelTransferStock = document.getElementById('cancelTransferStock');
const transferSourceArea = document.getElementById('transferSourceArea');
const transferTargetArea = document.getElementById('transferTargetArea');

// 采购申请确认弹窗
const applyConfirmModal = document.getElementById('applyConfirmModal');
const closeApplyConfirmModal = document.getElementById('closeApplyConfirmModal');
const cancelApplyConfirm = document.getElementById('cancelApplyConfirm');
const confirmApply = document.getElementById('confirmApply');
const applyConfirmContent = document.getElementById('applyConfirmContent');

// 现有产品选择弹窗
const selectExistingProductModal = document.getElementById('selectExistingProductModal');
const closeSelectExistingProductModal = document.getElementById('closeSelectExistingProductModal');
const cancelSelectExistingProduct = document.getElementById('cancelSelectExistingProduct');
const confirmSelectExistingProduct = document.getElementById('confirmSelectExistingProduct');
const existingProductSelect = document.getElementById('existingProductSelect');
const existingProductPrice = document.getElementById('existingProductPrice');
const existingTotalStock = document.getElementById('existingTotalStock');
const existingNorthStock = document.getElementById('existingNorthStock');
const existingCentralStock = document.getElementById('existingCentralStock');
const existingEastStock = document.getElementById('existingEastStock');
const existingSouthwestStock = document.getElementById('existingSouthwestStock');

// 出库模态框
const outStockModal = document.getElementById('outStockModal');
const closeOutStockModal = document.getElementById('closeOutStockModal');
const cancelOutStock = document.getElementById('cancelOutStock');
const outStockForm = document.getElementById('outStockForm');
const outProductIndex = document.getElementById('outProductIndex');
const outProductName = document.getElementById('outProductName');
const outProductType = document.getElementById('outProductType');
const outProductSpec = document.getElementById('outProductSpec');
const outOperator = document.getElementById('outOperator');
const outDate = document.getElementById('outDate');
const outArea = document.getElementById('outArea');


// 详情模态框
const detailModal = document.getElementById('detailModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const productDetail = document.getElementById('productDetail');
const historyTableBody = document.getElementById('historyTableBody');

// 采购详情模态框
const purchaseDetailModal = document.getElementById('purchaseDetailModal');
const closePurchaseDetailModal = document.getElementById('closePurchaseDetailModal');
const purchaseDetailContent = document.getElementById('purchaseDetailContent');
const documentsList = document.getElementById('documentsList');
const documentUpload = document.getElementById('documentUpload');
const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');





// 采购记录列表相关DOM元素
const purchaseProductNameInput = document.getElementById('purchaseProductNameInput');
const purchaseProductTypeInput = document.getElementById('purchaseProductTypeInput');
const purchaseProductSpecInput = document.getElementById('purchaseProductSpecInput');
const searchPurchaseBtn = document.getElementById('searchPurchaseBtn');
const resetPurchaseBtn = document.getElementById('resetPurchaseBtn');
const purchaseHistoryTableBody = document.getElementById('purchaseHistoryTableBody');

// 物品管理相关DOM元素
let itemIdInput;
let itemNameInput;
let itemBrandInput;
let itemModelInput;
let searchItemBtn;
let resetItemBtn;
let addItemBtn;
let itemTableBody;

let editItemModal;
let closeEditItemModal;
let cancelEditItem;
let editItemForm;
let editItemIndex;
let editItemId;
let editItemName;
let editItemBrand;
let editItemModel;
let editItemUnit;
let editItemCategory;
let editItemRemark;
let editWarningThreshold;
let editWarningFixed;

// 物品管理模态框相关DOM元素
let addItemModal;
let closeAddItemModal;
let cancelAddItem;
let addItemForm;
let addItemId;
let addItemName;
let addItemBrand;
let addItemModel;
let addItemUnit;
let addItemCategory;
let addItemRemark;
let addWarningThreshold;
let addWarningFixed;

// 物品预警设置模态框相关DOM元素
let itemWarningSettingModal;
let closeItemWarningSettingModal;
let itemWarningSettingForm;
let cancelItemWarningSetting;
let itemWarningIndex;
let itemWarningName;
let itemWarningModel;
let itemWarningThreshold;
let itemWarningFixed;

// 上传资料模态框相关DOM元素
const uploadDocumentsModal = document.getElementById('uploadDocumentsModal');
const closeUploadDocumentsModal = document.getElementById('closeUploadDocumentsModal');
const uploadDocumentInfo = document.getElementById('uploadDocumentInfo');
const uploadDocumentsList = document.getElementById('uploadDocumentsList');
const uploadDocumentFile = document.getElementById('uploadDocumentFile');
const uploadDocumentSubmit = document.getElementById('uploadDocumentSubmit');

// 当前正在处理的采购记录
let currentUploadRecord = null;

// 页面加载时初始化表格
window.addEventListener('DOMContentLoaded', () => {
    // 获取所有DOM元素，确保它们指向正确的DOM元素
    // 物品管理相关DOM元素
    itemIdInput = document.getElementById('itemIdInput');
    itemNameInput = document.getElementById('itemNameInput');
    itemBrandInput = document.getElementById('itemBrandInput');
    itemModelInput = document.getElementById('itemModelInput');
    searchItemBtn = document.getElementById('searchItemBtn');
    resetItemBtn = document.getElementById('resetItemBtn');
    addItemBtn = document.getElementById('addItemBtn');
    itemTableBody = document.getElementById('itemTableBody');
    
    editItemModal = document.getElementById('editItemModal');
    closeEditItemModal = document.getElementById('closeEditItemModal');
    cancelEditItem = document.getElementById('cancelEditItem');
    editItemForm = document.getElementById('editItemForm');
    editItemIndex = document.getElementById('editItemIndex');
    editItemId = document.getElementById('editItemId');
    editItemName = document.getElementById('editItemName');
    editItemBrand = document.getElementById('editItemBrand');
    editItemModel = document.getElementById('editItemModel');
    editItemUnit = document.getElementById('editItemUnit');
    editItemCategory = document.getElementById('editItemCategory');
    editItemRemark = document.getElementById('editItemRemark');
    editWarningThreshold = document.getElementById('editWarningThreshold');
    editWarningFixed = document.getElementById('editWarningFixed');
    
    // 物品管理模态框相关DOM元素
    addItemModal = document.getElementById('addItemModal');
    closeAddItemModal = document.getElementById('closeAddItemModal');
    cancelAddItem = document.getElementById('cancelAddItem');
    addItemForm = document.getElementById('addItemForm');
    addItemId = document.getElementById('addItemId');
    addItemName = document.getElementById('addItemName');
    addItemBrand = document.getElementById('addItemBrand');
    addItemModel = document.getElementById('addItemModel');
    addItemUnit = document.getElementById('addItemUnit');
    addItemCategory = document.getElementById('addItemCategory');
    addItemRemark = document.getElementById('addItemRemark');
    addWarningThreshold = document.getElementById('addWarningThreshold');
    addWarningFixed = document.getElementById('addWarningFixed');
    
    // 物品预警设置模态框相关DOM元素
    itemWarningSettingModal = document.getElementById('itemWarningSettingModal');
    closeItemWarningSettingModal = document.getElementById('closeItemWarningSettingModal');
    itemWarningSettingForm = document.getElementById('itemWarningSettingForm');
    cancelItemWarningSetting = document.getElementById('cancelItemWarningSetting');
    itemWarningIndex = document.getElementById('itemWarningIndex');
    itemWarningName = document.getElementById('itemWarningName');
    itemWarningModel = document.getElementById('itemWarningModel');
    itemWarningThreshold = document.getElementById('itemWarningThreshold');
    itemWarningFixed = document.getElementById('itemWarningFixed');
    // 设置当前时间为默认时间（北京时间）
    const now = new Date();
    // 获取UTC时间并加上8小时（北京时间比UTC早8小时）
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const formattedDate = beijingTime.toISOString().slice(0, 16);
    applyDate.value = formattedDate;
    outDate.value = formattedDate;
    
    // 显示用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        let displayText = `${user.username} (${user.identity})`;
        if (user.area) {
            displayText += ` - ${user.area}`;
        }
        // 只更新侧边栏的用户信息
        if (userDisplayNameSidebar) {
            userDisplayNameSidebar.textContent = displayText;
        }
    }
    
    // 登出按钮点击事件
    logoutBtn.addEventListener('click', function() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
    
    // 设置初始片区筛选按钮状态
    const allAreaBtn = document.querySelector('[onclick="filterByArea(\'all\')"]');
    if (allAreaBtn) {
        allAreaBtn.classList.add('active');
    }
    
    // 初始化表格头部
    updateTableHeader();
    
    // 加载库存数据
    loadInventoryData();
    // 加载出入库记录
    loadStockHistory();
    // 加载采购申请
    initPurchaseApplications();
    // 加载物品管理数据（在库存数据之后加载）
    loadItemManagementData();
    
    // 绑定预警提示模态框事件
    const warningAlertModal = document.getElementById('warningAlertModal');
    const closeWarningAlertModal = document.getElementById('closeWarningAlertModal');
    const acknowledgeWarningBtn = document.getElementById('acknowledgeWarningBtn');
    
    if (closeWarningAlertModal) {
        closeWarningAlertModal.addEventListener('click', () => {
            warningAlertModal.style.display = 'none';
        });
    }
    
    if (acknowledgeWarningBtn) {
        acknowledgeWarningBtn.addEventListener('click', () => {
            warningAlertModal.style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === warningAlertModal) {
            warningAlertModal.style.display = 'none';
        }
    });
    
    // 绑定搜索按钮点击事件
    searchBtn.addEventListener('click', handleSearch);
    
    // 绑定回车键搜索
    productTypeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    productNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 绑定审批管理按钮点击事件
    approvalManageBtn.addEventListener('click', () => {
        // 重新获取approvalList元素，确保它指向正确的DOM元素
        approvalList = document.getElementById('approvalList');
        // 加载待审批列表
        loadApprovalList();
        // 打开审批管理模态框
        approvalManageModal.style.display = 'block';
    });
    
    // 绑定入库管理按钮点击事件
    if (inStockBtn) {
        inStockBtn.addEventListener('click', () => {
            // 加载待入库列表
            loadInStockList();
            // 打开入库管理模态框
            inStockModal.style.display = 'block';
        });
    }
    
    // 绑定导出采购申请按钮点击事件
    if (exportPurchaseBtn) {
        exportPurchaseBtn.addEventListener('click', () => {
            // 打开导出采购申请模态框
            exportPurchaseModal.style.display = 'block';
        });
    }
    
    // 绑定导出库存按钮点击事件
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');
    if (exportInventoryBtn) {
        exportInventoryBtn.addEventListener('click', exportInventoryData);
    }
    
    // 绑定导出采购申请表单提交事件
    if (exportPurchaseForm) {
        exportPurchaseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleExportPurchase();
        });
    }
    
    // 绑定库存转移模态框事件
    if (closeTransferStockModal) {
        closeTransferStockModal.addEventListener('click', () => {
            transferStockModal.style.display = 'none';
        });
    }
    
    if (cancelTransferStock) {
        cancelTransferStock.addEventListener('click', () => {
            transferStockModal.style.display = 'none';
        });
    }
    
    if (transferStockForm) {
        transferStockForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleTransferStockSubmit(e);
        });
    }
    
    // 绑定源片区选择事件
    if (transferSourceArea) {
        transferSourceArea.addEventListener('change', updateTransferSourceStock);
    }
    
    // 绑定目标片区选择事件
    if (transferTargetArea) {
        transferTargetArea.addEventListener('change', updateTransferTargetStock);
    }
    
    // 点击模态框外部关闭库存转移模态框
    window.addEventListener('click', (e) => {
        if (e.target === transferStockModal) {
            transferStockModal.style.display = 'none';
        }
    });
    
    // 绑定全选/取消全选复选框点击事件
    const selectAllInventory = document.getElementById('selectAllInventory');
    if (selectAllInventory) {
        selectAllInventory.addEventListener('change', toggleSelectAllInventory);
    }
    
    // 绑定出入库记录全选/取消全选复选框点击事件
    const selectAllStockHistory = document.getElementById('selectAllStockHistory');
    if (selectAllStockHistory) {
        selectAllStockHistory.addEventListener('change', toggleSelectAllStockHistory);
    }
    
    // 绑定导出按钮点击事件
    const exportStockHistoryBtn = document.getElementById('exportStockHistoryBtn');
    if (exportStockHistoryBtn) {
        exportStockHistoryBtn.addEventListener('click', exportStockHistory);
    }
    
    // 绑定历史库存查询按钮点击事件
    const historySearchBtn = document.getElementById('historySearchBtn');
    if (historySearchBtn) {
        historySearchBtn.addEventListener('click', searchHistoryInventory);
    }
    
    // 绑定重置历史库存查询按钮点击事件
    const resetHistoryBtn = document.getElementById('resetHistoryBtn');
    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', resetHistorySearch);
    }
    
    // 导航切换功能
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有导航项的active类
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // 添加当前导航项的active类
            item.classList.add('active');
            
            // 隐藏所有模块
            const modules = document.querySelectorAll('.module');
            modules.forEach(module => module.classList.remove('active'));
            
            // 显示目标模块
            const targetModule = item.getAttribute('data-target');
            document.getElementById(targetModule).classList.add('active');
            
            // 保存当前模块到localStorage
            localStorage.setItem('currentModule', targetModule);
        });
    });
    
    // 页面加载时恢复当前模块
    const savedModule = localStorage.getItem('currentModule');
    if (savedModule) {
        // 移除所有导航项的active类
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // 隐藏所有模块
        const modules = document.querySelectorAll('.module');
        modules.forEach(module => module.classList.remove('active'));
        
        // 显示保存的模块
        const savedModuleElement = document.getElementById(savedModule);
        if (savedModuleElement) {
            savedModuleElement.classList.add('active');
            
            // 激活对应的导航项
            const correspondingNavItem = document.querySelector(`.nav-item[data-target="${savedModule}"]`);
            if (correspondingNavItem) {
                correspondingNavItem.classList.add('active');
            }
        } else {
            // 如果保存的模块不存在，默认显示库存清单
            document.getElementById('inventory-module').classList.add('active');
            document.querySelector('.nav-item[data-target="inventory-module"]').classList.add('active');
        }
    } else {
        // 首次登录，默认显示库存清单
        document.getElementById('inventory-module').classList.add('active');
        document.querySelector('.nav-item[data-target="inventory-module"]').classList.add('active');
    }
    
    // 绑定采购申请按钮点击事件
    purchaseApplyBtn.addEventListener('click', () => {
        // 获取当前登录用户信息
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            // 显示申请人为登录账号
            applyOperator.innerHTML = user.username;
        }
        // 设置申请时间为当前北京时间（UTC+8）
        const now = new Date();
        // 获取UTC时间并加上8小时（北京时间比UTC早8小时）
        const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const formattedDate = beijingTime.toISOString().slice(0, 16);
        applyDate.value = formattedDate;
        // 打开采购申请模态框
        purchaseApplyModal.style.display = 'block';
        // 根据用户所属片区限制采购申请的片区字段
        restrictPurchaseAreaByUserArea();
    });
    
    // 审批管理模态框关闭事件
        closeApprovalManageModal.addEventListener('click', () => {
            approvalManageModal.style.display = 'none';
        });
        
        // 入库管理模态框关闭事件
        closeInStockModal.addEventListener('click', () => {
            inStockModal.style.display = 'none';
        });
        
        // 导出采购申请模态框关闭事件
        closeExportPurchaseModal.addEventListener('click', () => {
            exportPurchaseModal.style.display = 'none';
            exportPurchaseForm.reset();
        });
        
        // 取消导出采购申请
        cancelExportPurchase.addEventListener('click', () => {
            exportPurchaseModal.style.display = 'none';
            exportPurchaseForm.reset();
        });
        
        // 初始化采购申请数据
        initPurchaseApplications();
        
        // 初始化采购申请数据
        function initPurchaseApplications() {
            const storedApplications = localStorage.getItem('purchaseApplications');
            if (storedApplications) {
                purchaseApplications = JSON.parse(storedApplications);
            } else {
                purchaseApplications = [];
            }
        }
    
    // 绑定重置按钮点击事件
    resetBtn.addEventListener('click', resetSearch);
    
    // 绑定添加现有产品按钮点击事件
    addExistingProductBtn.addEventListener('click', () => {
        // 打开现有产品选择弹窗
        selectExistingProductModal.style.display = 'block';
        // 根据用户所属片区限制采购申请的片区字段
        restrictPurchaseAreaByUserAreaInSelectModal();
        // 初始化自动完成功能
        initExistingProductAutocomplete();
        // 重置自动完成状态
        resetExistingProductAutocomplete();
    });
    
    // 绑定下载模板按钮点击事件
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            downloadPurchaseTemplate();
        });
    }
    
    // 绑定导入模板按钮点击事件
    const importTemplateBtn = document.getElementById('importTemplateBtn');
    if (importTemplateBtn) {
        importTemplateBtn.addEventListener('click', () => {
            document.getElementById('importTemplateFile').click();
        });
    }
    
    // 绑定添加物品按钮点击事件
    if (addItemBtn) {
        addItemBtn.addEventListener('click', openAddItemModal);
    }
    
    // 绑定物品预警设置模态框事件
    if (closeItemWarningSettingModal) {
        closeItemWarningSettingModal.addEventListener('click', () => {
            itemWarningSettingModal.style.display = 'none';
            itemWarningSettingForm.reset();
        });
    }
    
    if (cancelItemWarningSetting) {
        cancelItemWarningSetting.addEventListener('click', () => {
            itemWarningSettingModal.style.display = 'none';
            itemWarningSettingForm.reset();
        });
    }
    
    if (itemWarningSettingForm) {
        itemWarningSettingForm.addEventListener('submit', handleItemWarningSettingSubmit);
    }
    
    // 点击物品预警设置模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === itemWarningSettingModal) {
            itemWarningSettingModal.style.display = 'none';
            itemWarningSettingForm.reset();
        }
    });
    
    // 绑定添加物品表单提交事件
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItemSubmit);
    }
    
    // 绑定添加物品模态框关闭事件
    if (closeAddItemModal) {
        closeAddItemModal.addEventListener('click', () => {
            addItemModal.style.display = 'none';
            addItemForm.reset();
        });
    }
    
    // 绑定添加物品模态框取消按钮点击事件
    if (cancelAddItem) {
        cancelAddItem.addEventListener('click', () => {
            addItemModal.style.display = 'none';
            addItemForm.reset();
        });
    }
    
    // 根据用户所属片区限制采购申请的片区字段（在现有产品选择模态框中）
    function restrictPurchaseAreaByUserAreaInSelectModal() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.area || user.identity === '总部综管员') {
            // 总部综管员可以申请所有片区
            return;
        }
        
        // 获取所有片区输入框
        const northStock = document.getElementById('existingNorthStock');
        const centralStock = document.getElementById('existingCentralStock');
        const eastStock = document.getElementById('existingEastStock');
        const southwestStock = document.getElementById('existingSouthwestStock');
        
        // 禁用所有片区输入框
        northStock.disabled = true;
        centralStock.disabled = true;
        eastStock.disabled = true;
        southwestStock.disabled = true;
        
        // 不显示任何默认数值
        northStock.value = '';
        centralStock.value = '';
        eastStock.value = '';
        southwestStock.value = '';
        
        // 只启用用户所属片区的输入框
        switch (user.area) {
            case '北二片区':
                northStock.disabled = false;
                break;
            case '东片区':
                centralStock.disabled = false;
                break;
            case '中片区':
                eastStock.disabled = false;
                break;
            case '西南片区':
                southwestStock.disabled = false;
                break;
        }
    }
    
    // 根据用户所属片区限制采购申请的片区字段
    function restrictPurchaseAreaByUserArea() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.area || user.identity === '总部综管员') {
            // 总部综管员可以申请所有片区
            return;
        }
        
        // 这个函数主要用于限制采购申请表格中的片区输入，但由于表格行是动态生成的，
        // 我们将在addProductRowWithData和addProductRow函数中处理限制逻辑
    }
    
    
    
    // 采购申请表单提交事件
    purchaseApplyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlePurchaseApplySubmit();
    });
    
    // 采购申请模态框关闭事件
    closePurchaseApplyModal.addEventListener('click', () => {
        purchaseApplyModal.style.display = 'none';
        purchaseApplyForm.reset();
        // 清空产品列表和申请人信息
        productListBody.innerHTML = '';
        applyOperator.innerHTML = '';
        applyDate.value = formattedDate;
    });
    
    cancelPurchaseApply.addEventListener('click', () => {
        purchaseApplyModal.style.display = 'none';
        purchaseApplyForm.reset();
        // 清空产品列表和申请人信息
        productListBody.innerHTML = '';
        applyOperator.innerHTML = '';
        applyDate.value = formattedDate;
    });
    
    // 现有产品选择弹窗关闭事件
    closeSelectExistingProductModal.addEventListener('click', () => {
        selectExistingProductModal.style.display = 'none';
        resetExistingProductForm();
    });
    
    cancelSelectExistingProduct.addEventListener('click', () => {
        selectExistingProductModal.style.display = 'none';
        resetExistingProductForm();
    });
    
    // 确认添加现有产品
    confirmSelectExistingProduct.addEventListener('click', () => {
        addExistingProductFromItemManagement();
    });
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === selectExistingProductModal) {
            selectExistingProductModal.style.display = 'none';
            resetExistingProductForm();
        }
    });
    
    // 采购申请确认弹窗事件
    closeApplyConfirmModal.addEventListener('click', () => {
        applyConfirmModal.style.display = 'none';
    });
    
    cancelApplyConfirm.addEventListener('click', () => {
        applyConfirmModal.style.display = 'none';
    });
    
    confirmApply.addEventListener('click', () => {
        handleApplyConfirm();
    });
    
    // 出库模态框事件监听
    closeOutStockModal.addEventListener('click', () => {
        outStockModal.style.display = 'none';
        outStockForm.reset();
        outDate.value = formattedDate;
    });
    
    cancelOutStock.addEventListener('click', () => {
        outStockModal.style.display = 'none';
        outStockForm.reset();
        outDate.value = formattedDate;
    });
    
    outStockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleOutStockSubmit();
    });
    
    // 详情模态框事件监听
    closeDetailModal.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });
    
    // 采购详情模态框事件监听
    closePurchaseDetailModal.addEventListener('click', () => {
        purchaseDetailModal.style.display = 'none';
        documentUpload.value = ''; // 清空文件上传输入框
    });
    
    // 资料上传按钮点击事件
    uploadDocumentBtn.addEventListener('click', handleDocumentUpload);
    

    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === purchaseApplyModal) {
            purchaseApplyModal.style.display = 'none';
            purchaseApplyForm.reset();
            // 清空产品列表和申请人信息
            productListBody.innerHTML = '';
            applyOperator.innerHTML = '';
            applyDate.value = formattedDate;
        }
        if (e.target === applyConfirmModal) {
            applyConfirmModal.style.display = 'none';
        }
        if (e.target === outStockModal) {
            outStockModal.style.display = 'none';
            outStockForm.reset();
            outDate.value = formattedDate;
        }
        if (e.target === detailModal) {
            detailModal.style.display = 'none';
        }
        if (e.target === purchaseDetailModal) {
            purchaseDetailModal.style.display = 'none';
            documentUpload.value = ''; // 清空文件上传输入框
        }

        if (e.target === approvalManageModal) {
            approvalManageModal.style.display = 'none';
        }
    });
    
    // 初始化采购记录表格
    renderStockHistoryTable(stockHistory);
    
    // 加载物品管理数据
    loadItemManagementData();
    
    // 检查是否有审批工单并更新红点提示
    checkApprovalRequests();
    
    // 绑定出入库记录搜索按钮点击事件
    searchPurchaseBtn.addEventListener('click', handleStockHistorySearch);
    
    // 绑定出入库记录重置按钮点击事件
    resetPurchaseBtn.addEventListener('click', resetStockHistorySearch);
    
    // 绑定出入库记录回车键搜索
    purchaseProductNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStockHistorySearch();
        }
    });
    
    purchaseProductTypeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStockHistorySearch();
        }
    });
    
    purchaseProductSpecInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStockHistorySearch();
        }
    });
    
    // 上传资料模态框关闭事件
    closeUploadDocumentsModal.addEventListener('click', () => {
        uploadDocumentsModal.style.display = 'none';
        // 清空文件输入和当前记录
        uploadDocumentFile.value = '';
        currentUploadRecord = null;
    });
    
    // 上传资料按钮点击事件
    uploadDocumentSubmit.addEventListener('click', handleDirectDocumentUpload);
    
    // 点击上传资料模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === uploadDocumentsModal) {
            uploadDocumentsModal.style.display = 'none';
            // 清空文件输入和当前记录
            uploadDocumentFile.value = '';
            currentUploadRecord = null;
        }
    });
    

    
    // 关闭编辑物品模态框
    closeEditItemModal.addEventListener('click', () => {
        editItemModal.style.display = 'none';
        editItemForm.reset();
    });
    
    cancelEditItem.addEventListener('click', () => {
        editItemModal.style.display = 'none';
        editItemForm.reset();
    });
    
    // 编辑物品表单提交事件
    editItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleEditItemSubmit();
    });
    
    // 绑定物品搜索按钮点击事件
    searchItemBtn.addEventListener('click', handleItemSearch);
    
    // 绑定物品重置按钮点击事件
    resetItemBtn.addEventListener('click', resetItemSearch);
    
    // 绑定物品回车键搜索
    itemIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleItemSearch();
        }
    });
    
    itemNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleItemSearch();
        }
    });
    
    itemBrandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleItemSearch();
        }
    });
    
    itemModelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleItemSearch();
        }
    });
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', (e) => {
        if (e.target === addItemModal) {
            addItemModal.style.display = 'none';
            addItemForm.reset();
        }
        if (e.target === editItemModal) {
            editItemModal.style.display = 'none';
            editItemForm.reset();
        }
    });
});

// 从采购记录列表打开上传资料模态框
function openUploadDocumentsModal(productName, productType, productSpec, operationTime, operator) {
    // 找到对应的采购记录
    const record = stockHistory.find(r => 
        r.productName === productName && 
        r.productType === productType && 
        r.productSpec === productSpec && 
        r.operationTime === operationTime && 
        r.operator === operator
    );
    
    if (!record) {
        alert('未找到采购记录！');
        return;
    }
    
    // 保存当前采购记录
    currentUploadRecord = record;
    
    // 生成采购记录信息
    const infoContent = `
        <div class="product-detail-item">
            <span class="product-detail-label">产品名称</span>
            <span class="product-detail-value">${record.productName}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">产品类型</span>
            <span class="product-detail-value">${record.productType}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">产品规格</span>
            <span class="product-detail-value">${record.productSpec}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">操作时间</span>
            <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">操作人</span>
            <span class="product-detail-value">${record.operator}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">单价</span>
            <span class="product-detail-value">¥${parseFloat(record.price).toFixed(2)}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">总数量</span>
            <span class="product-detail-value">${record.totalStock}</span>
        </div>
    `;
    
    uploadDocumentInfo.innerHTML = infoContent;
    
    // 加载已上传的资料
    loadUploadedDocuments(record);
    
    // 打开上传资料模态框
    uploadDocumentsModal.style.display = 'block';
}

// 加载已上传的资料
function loadUploadedDocuments(record) {
    // 生成记录键
    let recordKey;
    if (record.purchaseId) {
        // 新的数据结构，使用purchaseId作为键
        recordKey = record.purchaseId;
    } else {
        // 旧的数据结构
        recordKey = `${record.productName}_${record.productType}_${record.productSpec}_${record.operationTime}`;
    }
    
    // 从localStorage获取文档列表
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    const recordDocuments = documents[recordKey] || [];
    
    // 显示文档列表
    if (recordDocuments.length === 0) {
        uploadDocumentsList.innerHTML = '<p>暂无采购资料</p>';
        return;
    }
    
    let documentsHtml = '<ul style="list-style: none; padding: 0;">';
    recordDocuments.forEach((doc, index) => {
        documentsHtml += `
            <li style="margin: 8px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${doc.name}</span>
                    <button type="button" onclick="viewUploadedDocument('${recordKey}', ${index})" style="padding: 4px 8px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">查看</button>
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    上传时间: ${formatDateTime(doc.uploadTime)} | 大小: ${formatFileSize(doc.size)}
                </div>
            </li>
        `;
    });
    documentsHtml += '</ul>';
    uploadDocumentsList.innerHTML = documentsHtml;
}

// 查看已上传的资料
function viewUploadedDocument(recordKey, docIndex) {
    // 从localStorage获取文档列表
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    const recordDocuments = documents[recordKey] || [];
    const doc = recordDocuments[docIndex];
    
    if (doc) {
        // 创建临时链接打开文档
        const blob = new Blob([base64ToBlob(doc.content, doc.type)], { type: doc.type });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
}

// 直接处理文档上传
function handleDirectDocumentUpload() {
    const files = uploadDocumentFile.files;
    if (files.length === 0) {
        alert('请选择要上传的文件！');
        return;
    }
    
    const record = currentUploadRecord;
    if (!record) {
        alert('未找到当前采购记录！');
        return;
    }
    
    // 生成记录键
    let recordKey;
    if (record.purchaseId) {
        // 新的数据结构，使用purchaseId作为键
        recordKey = record.purchaseId;
    } else {
        // 旧的数据结构
        recordKey = `${record.productName}_${record.productType}_${record.productSpec}_${record.operationTime}`;
    }
    
    // 从localStorage获取文档列表
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    let recordDocuments = documents[recordKey] || [];
    
    // 处理每个文件
    const filesArray = Array.from(files);
    let uploadedCount = 0;
    
    filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Content = e.target.result.split(',')[1];
            
            // 添加文档到列表
            const newDoc = {
                name: file.name,
                type: file.type,
                size: file.size,
                content: base64Content,
                uploadTime: getBeijingTimeISOString()
            };
            
            recordDocuments.push(newDoc);
            uploadedCount++;
            
            // 全部上传完成后保存并刷新列表
            if (uploadedCount === filesArray.length) {
                documents[recordKey] = recordDocuments;
                localStorage.setItem('purchaseDocuments', JSON.stringify(documents));
                
                // 刷新文档列表
                loadUploadedDocuments(record);
                
                // 清空文件输入
                uploadDocumentFile.value = '';
                
                alert('文件上传成功！');
            }
        };
        reader.readAsDataURL(file);
    });
}

// 按记录类型筛选记录
function filterByRecordType(recordType) {
    currentRecordTypeFilter = recordType;
    
    // 更新按钮状态
    const recordTypeBtns = document.querySelectorAll('.area-buttons .area-btn');
    recordTypeBtns.forEach(btn => {
        btn.classList.remove('active');
        // 检查按钮的onclick属性是否包含当前recordType值
        if (btn.onclick.toString().includes(`filterByRecordType('${recordType}')`)) {
            btn.classList.add('active');
        }
    });
    
    // 重新搜索，应用记录类型筛选
    handleStockHistorySearch();
}

// 渲染出入库记录表格
function renderStockHistoryTable(data) {
    purchaseHistoryTableBody.innerHTML = '';
    
    // 根据当前筛选的记录类型过滤数据
    let filteredRecords = data;
    if (currentRecordTypeFilter === 'purchase') {
        filteredRecords = data.filter(record => record.operationType === '采购入库');
    } else if (currentRecordTypeFilter === 'out') {
        filteredRecords = data.filter(record => record.operationType === '出库');
    }
    
    // 按时间倒序排序
    const stockRecords = filteredRecords
        .sort((a, b) => new Date(b.operationTime) - new Date(a.operationTime));
    
    if (stockRecords.length === 0) {
        let emptyMessage = '暂无出入库记录';
        if (currentRecordTypeFilter === 'purchase') {
            emptyMessage = '暂无采购记录';
        } else if (currentRecordTypeFilter === 'out') {
            emptyMessage = '暂无出库记录';
        }
        purchaseHistoryTableBody.innerHTML = `<tr><td colspan="14" style="text-align: center; padding: 20px;">${emptyMessage}</td></tr>`;
        return;
    }
    
    stockRecords.forEach((record, index) => {
        // 确定采购涉及的片区
        let areas = [];
        
        // 如果记录包含多个产品，统计所有产品涉及的片区
        if (record.products && record.products.length > 0) {
            record.products.forEach(product => {
                // 出库记录使用负数表示，所以需要检查绝对值是否大于0
                if (Math.abs(product.totalStock) > 0 && !areas.includes('北一片区')) areas.push('北一片区');
                if (Math.abs(product.northStock) > 0 && !areas.includes('北二片区')) areas.push('北二片区');
                if (Math.abs(product.centralStock) > 0 && !areas.includes('东片区')) areas.push('东片区');
                if (Math.abs(product.eastStock) > 0 && !areas.includes('中片区')) areas.push('中片区');
                if (Math.abs(product.southwestStock) > 0 && !areas.includes('西南片区')) areas.push('西南片区');
            });
        } else {
            // 兼容旧的数据结构，检查绝对值是否大于0
            if (Math.abs(record.totalStock) > 0) areas.push('北一片区');
            if (Math.abs(record.northStock) > 0) areas.push('北二片区');
            if (Math.abs(record.centralStock) > 0) areas.push('东片区');
            if (Math.abs(record.eastStock) > 0) areas.push('中片区');
            if (Math.abs(record.southwestStock) > 0) areas.push('西南片区');
        }
        
        const areaText = areas.join('、') || '未知片区';
        
        // 构建领用人信息
        let recipientsText = '';
        if (record.operationType === '出库' && record.recipients && record.recipients.length > 0) {
            recipientsText = record.recipients.map(recipient => `${recipient.name}(${recipient.quantity})`).join('; ');
        }
        
        // 构建操作按钮
        let actionButtons = '';
        
        if (record.purchaseId) {
            // 新的数据结构，使用purchaseId来标识唯一记录
            actionButtons = `
                <button class="action-btn detail-btn" onclick="viewPurchaseDetailByPurchaseId('${record.purchaseId}')" style="padding: 4px 8px; font-size: 12px;">详情</button>
            `;
        } else if (record.outStockId) {
            // 出库记录
            actionButtons = `
                <button class="action-btn detail-btn" onclick="viewOutStockDetail('${record.outStockId}')" style="padding: 4px 8px; font-size: 12px;">详情</button>
            `;
        } else {
            // 兼容旧的数据结构
            actionButtons = `
                <button class="action-btn detail-btn" onclick="viewPurchaseDetailFromHistory('${record.productName}', '${record.productType}', '${record.productSpec}', '${record.operationTime}', '${record.operator}')" style="padding: 4px 8px; font-size: 12px;">详情</button>
            `;
        }
        
        // 如果记录包含多个产品，为每个产品创建一行
        if (record.products && record.products.length > 0) {
            record.products.forEach((product, productIndex) => {
                const row = document.createElement('tr');
                
                // 只在第一个产品行显示复选框和基本信息
                const checkboxCell = productIndex === 0 ? `<td rowspan="${record.products.length}"><input type="checkbox" class="stock-history-checkbox" data-index="${index}"></td>` : '';
                const areaCell = productIndex === 0 ? `<td rowspan="${record.products.length}">${areaText}</td>` : '';
                const operationTypeCell = productIndex === 0 ? `<td rowspan="${record.products.length}">${record.operationType}</td>` : '';
                const operationTimeCell = productIndex === 0 ? `<td rowspan="${record.products.length}">${formatDateTime(record.operationTime)}</td>` : '';
                const operatorCell = productIndex === 0 ? `<td rowspan="${record.products.length}">${record.operator}</td>` : '';
                const recipientsCell = productIndex === 0 ? `<td rowspan="${record.products.length}">${recipientsText}</td>` : '';
                const actionCell = productIndex === 0 ? `<td rowspan="${record.products.length}" class="action-buttons">${actionButtons}</td>` : '';
                
                row.innerHTML = `
                    ${checkboxCell}
                    ${areaCell}
                    ${operationTypeCell}
                    ${operationTimeCell}
                    ${operatorCell}
                    ${recipientsCell}
                    <td>${product.productName}</td>
                    <td>${product.productSpec}</td>
                    <td>${product.totalStock || 0}</td>
                    <td>${product.northStock || 0}</td>
                    <td>${product.centralStock || 0}</td>
                    <td>${product.eastStock || 0}</td>
                    <td>${product.southwestStock || 0}</td>
                    ${actionCell}
                `;
                purchaseHistoryTableBody.appendChild(row);
            });
        } else {
            // 兼容旧的数据结构
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="stock-history-checkbox" data-index="${index}"></td>
                <td>${areaText}</td>
                <td>${record.operationType}</td>
                <td>${formatDateTime(record.operationTime)}</td>
                <td>${record.operator}</td>
                <td>${recipientsText}</td>
                <td>${record.productName || ''}</td>
                <td>${record.productSpec || ''}</td>
                <td>${record.totalStock || 0}</td>
                <td>${record.northStock || 0}</td>
                <td>${record.centralStock || 0}</td>
                <td>${record.eastStock || 0}</td>
                <td>${record.southwestStock || 0}</td>
                <td class="action-buttons">
                    ${actionButtons}
                </td>
            `;
            purchaseHistoryTableBody.appendChild(row);
        }
    });
}

// 处理出入库记录搜索
function handleStockHistorySearch() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const areaFilter = document.getElementById('areaFilter').value;
    
    let filteredData = stockHistory.filter(record => {
        // 显示所有出入库记录，记录类型筛选会在renderStockHistoryTable函数中处理
        
        // 检查时间范围
        const recordDate = new Date(record.operationTime);
        
        // 如果没有设置开始时间，或者记录时间大于等于开始时间（只比较日期部分）
        let matchesStartDate = true;
        if (startDate) {
            const startDateTime = new Date(startDate);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            const startDateOnly = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
            matchesStartDate = recordDateOnly >= startDateOnly;
        }
        
        // 如果没有设置结束时间，或者记录时间小于等于结束时间（只比较日期部分）
        let matchesEndDate = true;
        if (endDate) {
            const endDateTime = new Date(endDate);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            const endDateOnly = new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate());
            matchesEndDate = recordDateOnly <= endDateOnly;
        }
        
        // 检查片区筛选
        let matchesArea = true;
        if (areaFilter && areaFilter !== 'all') {
            // 检查记录是否涉及所选片区
            let hasAreaStock = false;
            
            if (record.products && record.products.length > 0) {
                // 新的数据结构，检查products数组
                record.products.forEach(product => {
                    switch (areaFilter) {
                        case 'northFirst':
                            if (Math.abs(product.totalStock) > 0) hasAreaStock = true;
                            break;
                        case 'north':
                            if (Math.abs(product.northStock) > 0) hasAreaStock = true;
                            break;
                        case 'central':
                            if (Math.abs(product.centralStock) > 0) hasAreaStock = true;
                            break;
                        case 'east':
                            if (Math.abs(product.eastStock) > 0) hasAreaStock = true;
                            break;
                        case 'southwest':
                            if (Math.abs(product.southwestStock) > 0) hasAreaStock = true;
                            break;
                        case 'yiFeng':
                            if (Math.abs(product.yiFengStock) > 0) hasAreaStock = true;
                            break;
                    }
                });
            } else {
                // 旧的数据结构
                switch (areaFilter) {
                    case 'northFirst':
                        hasAreaStock = Math.abs(record.totalStock) > 0;
                        break;
                    case 'north':
                        hasAreaStock = Math.abs(record.northStock) > 0;
                        break;
                    case 'central':
                        hasAreaStock = Math.abs(record.centralStock) > 0;
                        break;
                    case 'east':
                        hasAreaStock = Math.abs(record.eastStock) > 0;
                        break;
                    case 'southwest':
                        hasAreaStock = Math.abs(record.southwestStock) > 0;
                        break;
                    case 'yiFeng':
                        hasAreaStock = Math.abs(record.yiFengStock) > 0;
                        break;
                }
            }
            
            matchesArea = hasAreaStock;
        }
        
        return matchesStartDate && matchesEndDate && matchesArea;
    });
    
    renderStockHistoryTable(filteredData);
}

// 重置出入库记录搜索
function resetStockHistorySearch() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('areaFilter').value = 'all';
    
    renderStockHistoryTable(stockHistory);
}

// 初始化现有产品自动完成功能
function initExistingProductAutocomplete() {
    const input = document.getElementById('existingProductInput');
    const dropdown = document.getElementById('existingProductDropdown');
    const selectedIndexInput = document.getElementById('selectedProductIndex');
    
    // 移除现有的事件监听器，避免重复绑定
    input.removeEventListener('input', inputHandler);
    input.removeEventListener('focus', focusHandler);
    input.removeEventListener('keydown', keydownHandler);
    
    const showAllProductsBtn = document.getElementById('showAllProductsBtn');
    if (showAllProductsBtn) {
        showAllProductsBtn.removeEventListener('click', showAllHandler);
    }
    
    // 显示下拉列表
    function showDropdown(items) {
        dropdown.innerHTML = '';
        
        if (items.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        items.forEach((item, index) => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
            `;
            option.innerHTML = `${item.itemId} - ${item.itemName} - ${item.category} - ${item.itemModel}`;
            option.dataset.index = itemManagementData.findIndex(i => i.itemId === item.itemId);
            
            // 鼠标悬停效果
            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = '#f0f0f0';
            });
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'white';
            });
            
            // 点击选择
            option.addEventListener('click', () => {
                input.value = `${item.itemId} - ${item.itemName} - ${item.category} - ${item.itemModel}`;
                selectedIndexInput.value = option.dataset.index;
                dropdown.style.display = 'none';
            });
            
            dropdown.appendChild(option);
        });
        
        dropdown.style.display = 'block';
    }
    
    // 过滤产品数据
    function filterProducts(searchTerm) {
        if (!searchTerm) return [];
        
        const searchLower = searchTerm.toLowerCase();
        return itemManagementData.filter(item => {
            return item.itemName.toLowerCase().includes(searchLower) ||
                   item.category.toLowerCase().includes(searchLower) ||
                   item.itemModel.toLowerCase().includes(searchLower) ||
                   (item.brand && item.brand.toLowerCase().includes(searchLower)) ||
                   item.itemId.toLowerCase().includes(searchLower);
        });
    }
    
    // 输入事件处理
    function inputHandler(e) {
        const searchTerm = e.target.value.trim();
        const filteredItems = filterProducts(searchTerm);
        showDropdown(filteredItems);
        selectedIndexInput.value = ''; // 重置选择索引
    }
    
    // 焦点事件处理
    function focusHandler() {
        const searchTerm = input.value.trim();
        if (searchTerm) {
            const filteredItems = filterProducts(searchTerm);
            showDropdown(filteredItems);
        }
    }
    
    // 显示所有产品处理
    function showAllHandler() {
        // 检查下拉框是否已经显示
        if (dropdown.style.display === 'block') {
            // 如果已经显示，就隐藏它
            dropdown.style.display = 'none';
        } else {
            // 如果没有显示，就显示所有产品
            showDropdown(itemManagementData);
        }
    }
    
    // 键盘导航处理
    function keydownHandler(e) {
        const options = dropdown.querySelectorAll('.dropdown-option');
        let selectedIndex = -1;
        
        options.forEach((opt, index) => {
            if (opt.classList.contains('selected')) {
                selectedIndex = index;
            }
        });
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (selectedIndex < options.length - 1) {
                    if (options[selectedIndex]) {
                        options[selectedIndex].classList.remove('selected');
                    }
                    options[selectedIndex + 1].classList.add('selected');
                    options[selectedIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (selectedIndex > 0) {
                    options[selectedIndex].classList.remove('selected');
                    options[selectedIndex - 1].classList.add('selected');
                    options[selectedIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    options[selectedIndex].click();
                }
                break;
            case 'Escape':
                dropdown.style.display = 'none';
                break;
        }
    }
    
    // 绑定事件监听器
    input.addEventListener('input', inputHandler);
    input.addEventListener('focus', focusHandler);
    input.addEventListener('keydown', keydownHandler);
    
    if (showAllProductsBtn) {
        showAllProductsBtn.addEventListener('click', showAllHandler);
    }
    
    // 点击外部关闭下拉列表（只绑定一次）
    if (!window.hasClickOutsideListener) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#selectExistingProductModal')) {
                dropdown.style.display = 'none';
            }
        });
        window.hasClickOutsideListener = true;
    }
}

// 重置自动完成状态
function resetExistingProductAutocomplete() {
    const input = document.getElementById('existingProductInput');
    const dropdown = document.getElementById('existingProductDropdown');
    const selectedIndexInput = document.getElementById('selectedProductIndex');
    
    input.value = '';
    dropdown.style.display = 'none';
    selectedIndexInput.value = '';
}

// 添加现有产品到表单（从物品管理中获取）
function addExistingProductFromItemManagement() {
    const selectedIndex = parseInt(document.getElementById('selectedProductIndex').value);
    const input = document.getElementById('existingProductInput');
    const inputValue = input.value.trim();
    
    if (isNaN(selectedIndex) || !inputValue) {
        alert('请选择或输入一个有效的产品！');
        return;
    }
    
    const item = itemManagementData[selectedIndex];
    if (!item) {
        alert('未找到选中的产品！');
        return;
    }
    
    // 获取表单数据
    const price = parseFloat(existingProductPrice.value) || 0;
    const totalStock = parseFloat(existingTotalStock.value) || 0;
    const northStock = parseFloat(existingNorthStock.value) || 0;
    const centralStock = parseFloat(existingCentralStock.value) || 0;
    const eastStock = parseFloat(existingEastStock.value) || 0;
    const southwestStock = parseFloat(existingSouthwestStock.value) || 0;
    
    if (totalStock <= 0 && northStock <= 0 && centralStock <= 0 && eastStock <= 0 && southwestStock <= 0) {
        alert('请至少输入一个片区的采购数量！');
        return;
    }
    
    // 添加产品行
    addProductRowWithData(item.itemName, item.category, item.itemModel, price, totalStock, northStock, centralStock, eastStock, southwestStock);
    
    // 关闭弹窗并重置表单
    selectExistingProductModal.style.display = 'none';
    resetExistingProductForm();
}

// 从采购记录列表查看采购详情
function viewPurchaseDetailFromHistory(productName, productType, productSpec, operationTime, operator) {
    // 找到对应的采购记录
    const record = stockHistory.find(r => 
        r.productName === productName && 
        r.productType === productType && 
        r.productSpec === productSpec && 
        r.operationTime === operationTime && 
        r.operator === operator
    );
    
    if (!record) {
        alert('未找到采购记录！');
        return;
    }
    
    // 保存当前采购记录
    window.currentPurchaseRecord = record;
    
    // 生成采购详情内容
    const detailContent = `
        <div class="product-detail-info">
            <h3>采购记录基本信息</h3>
            <div class="product-detail-item">
                <span class="product-detail-label">操作类型</span>
                <span class="product-detail-value">${record.operationType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作时间</span>
                <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作人</span>
                <span class="product-detail-value">${record.operator}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">备注</span>
                <span class="product-detail-value">${record.remark}</span>
            </div>
        </div>
        
        <div class="purchase-products-list" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <h3>采购产品详情</h3>
            <table class="history-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>产品名称</th>
                        <th>产品类型</th>
                        <th>产品规格</th>
                        <th>单价</th>
                        <th>北一片区</th>
                        <th>北二片区</th>
                        <th>东片区</th>
                        <th>中片区</th>
                        <th>西南片区</th>
                        <th>总数量</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${record.productName}</td>
                        <td>${record.productType}</td>
                        <td>${record.productSpec}</td>
                        <td>¥${parseFloat(record.price).toFixed(2)}</td>
                        <td>${record.firstStock || 0}</td>
                        <td>${record.northStock}</td>
                        <td>${record.centralStock}</td>
                        <td>${record.eastStock}</td>
                        <td>${record.southwestStock}</td>
                        <td>${record.totalStock}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    purchaseDetailContent.innerHTML = detailContent;
    

    
    // 加载文档列表
    loadDocuments(record);
    
    // 保存当前产品历史记录，供查看采购详情使用
    window.currentProductHistory = stockHistory.filter(r => 
        r.productName === record.productName && 
        r.productType === record.productType && 
        r.productSpec === record.productSpec
    );
    
    // 打开采购详情模态框
    purchaseDetailModal.style.display = 'block';
}

// 处理修改产品信息提交


// 通过purchaseId查看采购详情
function viewPurchaseDetailByPurchaseId(purchaseId) {
    // 找到对应的采购记录
    const record = stockHistory.find(r => r.purchaseId === purchaseId);
    
    if (!record) {
        alert('未找到采购记录！');
        return;
    }
    
    // 保存当前采购记录
    window.currentPurchaseRecord = record;
    
    // 生成采购详情内容
    let detailContent = `
        <div class="product-detail-info">
            <h3>采购记录基本信息</h3>
            <div class="product-detail-item">
                <span class="product-detail-label">操作类型</span>
                <span class="product-detail-value">${record.operationType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作时间</span>
                <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作人</span>
                <span class="product-detail-value">${record.operator}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">备注</span>
                <span class="product-detail-value">${record.remark}</span>
            </div>
        </div>
        
        <div class="purchase-products-list" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <h3>采购产品详情</h3>
            <table class="history-table" style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>产品名称</th>
                        <th>产品类型</th>
                        <th>产品规格</th>
                        <th>单价</th>
                        <th>北一片区</th>
                        <th>北二片区</th>
                        <th>东片区</th>
                        <th>中片区</th>
                        <th>西南片区</th>
                        <th>总数量</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 添加产品列表
    if (record.products && record.products.length > 0) {
        // 新的数据结构，包含多个产品
        record.products.forEach(product => {
            detailContent += `
                <tr>
                    <td>${product.productName}</td>
                    <td>${product.productType}</td>
                    <td>${product.productSpec}</td>
                    <td>¥${parseFloat(product.price).toFixed(2)}</td>
                    <td>${product.firstStock || 0}</td>
                    <td>${product.northStock}</td>
                    <td>${product.centralStock}</td>
                    <td>${product.eastStock}</td>
                    <td>${product.southwestStock}</td>
                    <td>${product.totalStock}</td>
                </tr>
            `;
        });
    } else {
        // 兼容旧的数据结构
        detailContent += `
            <tr>
                <td>${record.productName}</td>
                <td>${record.productType}</td>
                <td>${record.productSpec}</td>
                <td>¥${parseFloat(record.price).toFixed(2)}</td>
                <td>${record.firstStock || 0}</td>
                <td>${record.northStock}</td>
                <td>${record.centralStock}</td>
                <td>${record.eastStock}</td>
                <td>${record.southwestStock}</td>
                <td>${record.totalStock}</td>
            </tr>
        `;
    }
    
    // 关闭表格
    detailContent += `
                </tbody>
            </table>
        </div>
    `;
    
    purchaseDetailContent.innerHTML = detailContent;
    

    
    // 加载文档列表
    loadDocuments(record);
    
    // 保存当前产品历史记录，供查看采购详情使用
    window.currentProductHistory = stockHistory.filter(r => {
        if (record.purchaseId) {
            // 新的数据结构，使用purchaseId关联
            return r.purchaseId === record.purchaseId;
        } else {
            // 兼容旧的数据结构
            return r.productName === record.productName && 
                   r.productType === record.productType && 
                   r.productSpec === record.productSpec;
        }
    });
    
    // 打开采购详情模态框
    purchaseDetailModal.style.display = 'block';
}

// 通过purchaseId打开上传资料模态框
function openUploadDocumentsModalByPurchaseId(purchaseId) {
    // 找到对应的采购记录
    const record = stockHistory.find(r => r.purchaseId === purchaseId);
    
    if (!record) {
        alert('未找到采购记录！');
        return;
    }
    
    // 保存当前采购记录
    currentUploadRecord = record;
    
    // 生成采购记录信息
    const infoContent = `
        <h3>采购记录信息</h3>
        <div class="product-detail-item">
            <span class="product-detail-label">操作类型</span>
            <span class="product-detail-value">${record.operationType}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">操作时间</span>
            <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">操作人</span>
            <span class="product-detail-value">${record.operator}</span>
        </div>
        <div class="product-detail-item">
            <span class="product-detail-label">产品数量</span>
            <span class="product-detail-value">${record.products ? record.products.length : 1} 个产品</span>
        </div>
    `;
    
    uploadDocumentInfo.innerHTML = infoContent;
    
    // 加载已上传的资料
    loadUploadedDocuments(record);
    
    // 打开上传资料模态框
    uploadDocumentsModal.style.display = 'block';
}

// 渲染库存表格
function renderInventoryTable(data) {
    inventoryTableBody.innerHTML = '';
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // 根据当前筛选的片区动态生成表格内容
        let stockColumns = '';
        const totalStock = (item.totalStock || 0) + (item.northStock || 0) + (item.eastStock || 0) + (item.centralStock || 0) + (item.southwestStock || 0) + (item.yiFengStock || 0);
        
        if (currentAreaFilter === 'all') {
            // 显示总库存和各片区库存
            stockColumns = `
                <td>${totalStock}</td>
                <td>${item.totalStock || 0}</td>
                <td>${item.northStock || 0}</td>
                <td>${item.eastStock || 0}</td>
                <td>${item.centralStock || 0}</td>
                <td>${item.southwestStock || 0}</td>
                <td>${item.yiFengStock || 0}</td>
            `;
        } else {
            // 只显示当前筛选片区的库存（不显示总库存）
            let areaStock = '';
            switch (currentAreaFilter) {
                case 'northFirst':
                    areaStock = item.totalStock || 0;
                    break;
                case 'north':
                    areaStock = item.northStock || 0;
                    break;
                case 'central':
                    areaStock = item.eastStock || 0;
                    break;
                case 'east':
                    areaStock = item.centralStock || 0;
                    break;
                case 'southwest':
                    areaStock = item.southwestStock || 0;
                    break;
                case 'yiFeng':
                    areaStock = item.yiFengStock || 0;
                    break;
            }
            
            stockColumns = `
                <td>${areaStock}</td>
            `;
        }
        
        // 产品编号：从物品管理数据中查找对应的itemId
        const itemInfo = itemManagementData.find(imItem => imItem.itemName === item.productName);
        const productId = item.itemId || (itemInfo ? itemInfo.itemId : `${item.productName.charAt(0).toUpperCase()}${index + 1}`);
        
        // 产品类别：优先使用productType，其次使用productCategory，最后从物品管理获取或使用默认值
        const productCategory = item.productType || item.productCategory || (itemInfo ? itemInfo.category : "固定资产");
        
        // 检查是否需要预警（任何一个片区低于预警值就显示预警）
        let showWarning = false;
        let warningClass = '';
        
        // 检查每个片区的预警
        const checkAreaWarning = (areaName, currentStock, fixedValue, threshold, refValue) => {
            if (fixedValue !== undefined && fixedValue !== null) {
                const shouldWarn = currentStock <= fixedValue;
                if (fixedValue !== null) {
                    console.log(`${areaName}: 当前库存=${currentStock}, 固定预警值=${fixedValue}, 是否预警=${shouldWarn}`);
                }
                return shouldWarn;
            } else if (threshold !== undefined && threshold !== null && refValue !== undefined && refValue !== null && refValue > 0) {
                const warningValue = refValue * (threshold / 100);
                const shouldWarn = currentStock <= warningValue;
                console.log(`${areaName}: 当前库存=${currentStock}, 预警阈值=${threshold}%, 参考总量=${refValue}, 预警值=${warningValue}, 是否预警=${shouldWarn}`);
                return shouldWarn;
            }
            return false;
        };
        
        // 检查各个片区
        showWarning = checkAreaWarning('北一片区', item.totalStock || 0, item.warningNorthFirstFixed, item.warningNorthFirstThreshold, item.warningNorthFirstRef) ||
                     checkAreaWarning('北二片区', item.northStock || 0, item.warningNorthFixed, item.warningNorthThreshold, item.warningNorthRef) ||
                     checkAreaWarning('东片区', item.eastStock || 0, item.warningEastFixed, item.warningEastThreshold, item.warningEastRef) ||
                     checkAreaWarning('中片区', item.centralStock || 0, item.warningCentralFixed, item.warningCentralThreshold, item.warningCentralRef) ||
                     checkAreaWarning('西南片区', item.southwestStock || 0, item.warningSouthwestFixed, item.warningSouthwestThreshold, item.warningSouthwestRef) ||
                     checkAreaWarning('益丰', item.yiFengStock || 0, item.warningYiFengFixed, item.warningYiFengThreshold, item.warningYiFengRef);
        
        if (showWarning) {
            warningClass = 'warning-row';
        }
        
        row.innerHTML = `
            <td><input type="checkbox" class="inventory-checkbox" data-index="${index}"></td>
            <td>${productId}</td>
            <td>${item.productName}</td>
            <td>${productCategory}</td>
            <td>${item.productSpec}</td>
            ${stockColumns}
            <td class="action-buttons">
                <button class="action-btn out-btn" onclick="openOutStockModalByName('${item.productName}', '${item.productSpec}')">出库</button>
                <button class="action-btn transfer-btn" onclick="openTransferStockModal('${item.productName}', '${item.productSpec}')">转移</button>
                <button class="action-btn detail-btn" onclick="openDetailModalByName('${item.productName}', '${item.productSpec}')">详情</button>
            </td>
        `;
        
        // 应用预警类到行
        if (warningClass) {
            row.classList.add(warningClass);
        }
        
        inventoryTableBody.appendChild(row);
    });
    
    // 重新绑定全选/取消全选复选框点击事件
    const selectAllInventory = document.getElementById('selectAllInventory');
    if (selectAllInventory) {
        selectAllInventory.addEventListener('change', toggleSelectAllInventory);
    }
}

// 当前筛选状态
let currentAreaFilter = 'all';

// 按片区筛选物资
function filterByArea(area) {
    currentAreaFilter = area;
    
    // 更新按钮状态
    const areaBtns = document.querySelectorAll('.area-btn');
    areaBtns.forEach(btn => {
        btn.classList.remove('active');
        // 检查按钮的onclick属性是否包含当前area值
        if (btn.onclick.toString().includes(`filterByArea('${area}')`)) {
            btn.classList.add('active');
        }
    });
    
    // 更新表格头部
    updateTableHeader();
    
    // 重新搜索，应用片区筛选
    handleSearch();
}

// 更新表格头部（只更新库存清单模块的表格）
function updateTableHeader() {
    // 只选择库存清单模块中的表格表头
    const inventoryModule = document.getElementById('inventory-module');
    if (!inventoryModule) return;
    
    const headerRow = inventoryModule.querySelector('.inventory-table thead tr');
    if (!headerRow) return;
    
    // 根据当前筛选的片区动态更新表头
    if (currentAreaFilter === 'all') {
        // 显示所有片区库存表头
        headerRow.innerHTML = `
            <th><input type="checkbox" id="selectAllInventory"></th>
            <th>产品编号</th>
            <th>产品名称</th>
            <th>产品类别</th>
            <th>产品规格</th>
            <th>总库存</th>
            <th>北一片区库存</th>
            <th>北二片区库存</th>
            <th>东片区库存</th>
            <th>中片区库存</th>
            <th>西南片区库存</th>
            <th>益丰库存</th>
            <th>操作</th>
        `;
    } else {
        // 只显示当前筛选片区的表头（不显示总库存）
        let areaHeader = '';
        switch (currentAreaFilter) {
            case 'northFirst':
                areaHeader = '<th>北一片区库存</th>';
                break;
            case 'north':
                areaHeader = '<th>北二片区库存</th>';
                break;
            case 'central':
                areaHeader = '<th>东片区库存</th>';
                break;
            case 'east':
                areaHeader = '<th>中片区库存</th>';
                break;
            case 'southwest':
                areaHeader = '<th>西南片区库存</th>';
                break;
            case 'yiFeng':
                areaHeader = '<th>益丰库存</th>';
                break;
        }
        
        headerRow.innerHTML = `
            <th><input type="checkbox" id="selectAllInventory"></th>
            <th>产品编号</th>
            <th>产品名称</th>
            <th>产品类别</th>
            <th>产品规格</th>
            ${areaHeader}
            <th>操作</th>
        `;
    }
    
    // 重新绑定全选/取消全选复选框点击事件
    const selectAllInventory = document.getElementById('selectAllInventory');
    if (selectAllInventory) {
        selectAllInventory.addEventListener('change', toggleSelectAllInventory);
    }
}

// 处理搜索功能
function handleSearch() {
    const productType = productTypeInput.value.trim().toLowerCase();
    const productName = productNameInput.value.trim().toLowerCase();
    
    let filteredData = inventoryData.filter(item => {
        const matchesType = productType === '' || item.productType.toLowerCase().includes(productType);
        const matchesName = productName === '' || item.productName.toLowerCase().includes(productName);
        return matchesType && matchesName;
    });
    
    // 应用片区筛选
    if (currentAreaFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            let areaStock;
            switch (currentAreaFilter) {
                case 'northFirst':
                    areaStock = item.totalStock;
                    break;
                case 'north':
                    areaStock = item.northStock;
                    break;
                case 'central':
                    areaStock = item.centralStock;
                    break;
                case 'east':
                    areaStock = item.eastStock;
                    break;
                case 'southwest':
                    areaStock = item.southwestStock;
                    break;
                case 'yiFeng':
                    areaStock = item.yiFengStock;
                    break;
                default:
                    areaStock = item.totalStock;
            }
            return areaStock > 0;
        });
    }
    
    renderInventoryTable(filteredData);
}

// 重置搜索
function resetSearch() {
    productTypeInput.value = '';
    productNameInput.value = '';
    
    // 重置片区筛选
    currentAreaFilter = 'all';
    const areaBtns = document.querySelectorAll('.area-btn');
    areaBtns.forEach(btn => {
        btn.classList.remove('active');
        // 检查按钮的onclick属性是否包含'all'值
        if (btn.onclick.toString().includes("filterByArea('all')")) {
            btn.classList.add('active');
        }
    });
    
    // 更新表格头部
    updateTableHeader();
    
    renderInventoryTable(inventoryData);
}

// 查询历史库存
function searchHistoryInventory() {
    const startDate = document.getElementById('historyStartDate').value;
    const endDate = document.getElementById('historyEndDate').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始日期和结束日期！');
        return;
    }
    
    // 计算历史库存状态
    const historicalInventory = calculateHistoricalInventory(startDate, endDate);
    
    // 渲染历史库存表格
    renderInventoryTable(historicalInventory);
}

// 重置历史库存查询
function resetHistorySearch() {
    document.getElementById('historyStartDate').value = '';
    document.getElementById('historyEndDate').value = '';
    // 恢复显示当前库存
    resetSearch();
}

// 计算指定时间范围内的历史库存
function calculateHistoricalInventory(startDate, endDate) {
    // 解析输入日期
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 设置结束日期为当天的最后一刻
    
    // 确定查询类型（年份或月份）
    const isYearQuery = start.getMonth() === 0 && start.getDate() === 1 && 
                       end.getMonth() === 11 && end.getDate() === 31;
    const isMonthQuery = start.getDate() === 1 && 
                        end.getDate() === new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    
    // 计算期初日期
    let startOfPeriodDate;
    if (isYearQuery) {
        // 年份查询：期初为上一年12月31日
        startOfPeriodDate = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (isMonthQuery) {
        // 月份查询：期初为上月最后一天
        startOfPeriodDate = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
    } else {
        // 其他查询：期初为查询开始日期
        startOfPeriodDate = new Date(start);
        startOfPeriodDate.setHours(0, 0, 0, 0);
    }
    
    // 复制当前库存数据作为基础
    const historicalInventory = JSON.parse(JSON.stringify(inventoryData));
    
    // 按时间排序历史记录（从新到旧）
    const sortedHistory = [...stockHistory].sort((a, b) => new Date(b.operationTime) - new Date(a.operationTime));
    
    // 过滤出查询时间之后的所有历史记录（需要反向应用）
    const filteredHistory = sortedHistory.filter(record => {
        const recordDate = new Date(record.operationTime);
        return recordDate > end;
    });
    
    // 应用历史记录到库存数据（从当前库存倒推到期初库存）
    filteredHistory.forEach(record => {
        if (record.products) {
            // 处理采购入库记录（包含多个产品）
            record.products.forEach(product => {
                const productIndex = historicalInventory.findIndex(item => 
                    item.productName === product.productName && 
                    item.productSpec === product.productSpec
                );
                
                if (productIndex !== -1) {
                    // 反向应用入库记录（从当前库存减去入库量）
                    historicalInventory[productIndex].northStock -= product.northStock;
                    historicalInventory[productIndex].centralStock -= product.centralStock;
                    historicalInventory[productIndex].eastStock -= product.eastStock;
                    historicalInventory[productIndex].southwestStock -= product.southwestStock;
                    historicalInventory[productIndex].totalStock -= product.totalStock;
                }
            });
        } else {
            // 处理出库记录（单个产品）
            const productIndex = historicalInventory.findIndex(item => 
                item.productName === record.productName && 
                item.productSpec === record.productSpec
            );
            
            if (productIndex !== -1) {
                // 反向应用出库记录（从当前库存加上出库量，因为出库记录中库存是负数）
                historicalInventory[productIndex].northStock += record.northStock;
                historicalInventory[productIndex].centralStock += record.centralStock;
                historicalInventory[productIndex].eastStock += record.eastStock;
                historicalInventory[productIndex].southwestStock += record.southwestStock;
                historicalInventory[productIndex].totalStock += record.totalStock;
            }
        }
    });
    
    // 过滤掉库存为负数的产品
    return historicalInventory.filter(item => item.totalStock >= 0);
}



// 动态生成现有产品选择列表
function populateExistingProductSelect() {
    existingProductSelect.innerHTML = '';
    
    if (inventoryData.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无现有产品';
        option.disabled = true;
        existingProductSelect.appendChild(option);
        return;
    }
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '请选择现有产品';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    existingProductSelect.appendChild(defaultOption);
    
    // 添加现有产品选项
    inventoryData.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${product.productName} (${product.productType} - ${product.productSpec}) - 综合单价: ¥${product.averagePrice.toFixed(2)}`;
        existingProductSelect.appendChild(option);
    });
}

// 重置现有产品表单
function resetExistingProductForm() {
    // 重置自动完成功能
    resetExistingProductAutocomplete();
    // 重置价格和数量输入框
    existingProductPrice.value = '';
    existingTotalStock.value = '';
    existingNorthStock.value = '';
    existingCentralStock.value = '';
    existingEastStock.value = '';
    existingSouthwestStock.value = '';
}



// 删除产品行
function removeProductRow(btn) {
    const row = btn.closest('.product-row');
    row.remove();
}

// 添加产品行（从物品管理中获取数据）
function addProductRowWithData(productName, productType, productSpec, productPrice, totalStock, northStock, centralStock, eastStock, southwestStock, yiFengStock) {
    // 检查是否传入的是对象参数
    let params;
    if (typeof productName === 'object' && productName !== null) {
        params = productName;
    } else {
        // 传统参数方式
        params = {
            productName: productName,
            productType: productType,
            productSpec: productSpec,
            price: productPrice,
            totalStock: totalStock,
            northStock: northStock,
            centralStock: centralStock,
            eastStock: eastStock,
            southwestStock: southwestStock,
            yiFengStock: yiFengStock
        };
    }
    
    // 提取参数
    const { 
        productName: name, 
        productType: type, 
        productSpec: spec, 
        price, 
        totalStock: total = 0, 
        northStock: north = 0, 
        centralStock: central = 0, 
        eastStock: east = 0, 
        southwestStock: southwest = 0,
        yiFengStock: yiFeng = 0
    } = params;
    
    const user = JSON.parse(localStorage.getItem('user'));
    const isAreaRestricted = user && user.area && user.identity !== '总部综管员';
    
    // 创建产品行
    const productRow = document.createElement('tr');
    productRow.className = 'product-row';
    productRow.innerHTML = `
        <td><input type="text" class="product-name" value="${name}" readonly required></td>
        <td><input type="text" class="product-type" value="${type}" readonly required></td>
        <td><input type="text" class="product-spec" value="${spec}" readonly required></td>
        <td><input type="number" class="product-price" step="0.01" min="0" value="${price}" required></td>
        <td><input type="number" class="total-stock" min="0" value="${total}" required ${isAreaRestricted && user.area !== '北一片区' ? 'disabled' : ''}></td>
        <td><input type="number" class="north-stock" min="0" value="${north}" required ${isAreaRestricted && user.area !== '北二片区' ? 'disabled' : ''}></td>
        <td><input type="number" class="central-stock" min="0" value="${central}" required ${isAreaRestricted && user.area !== '东片区' ? 'disabled' : ''}></td>
        <td><input type="number" class="east-stock" min="0" value="${east}" required ${isAreaRestricted && user.area !== '中片区' ? 'disabled' : ''}></td>
        <td><input type="number" class="southwest-stock" min="0" value="${southwest}" required ${isAreaRestricted && user.area !== '西南片区' ? 'disabled' : ''}></td>
        <td><input type="number" class="yifeng-stock" min="0" value="${yiFeng}" required ${isAreaRestricted && user.area !== '益丰' ? 'disabled' : ''}></td>
        <td><button type="button" class="remove-product-btn" onclick="removeProductRow(this)">删除</button></td>
    `;
    
    // 确保 productListBody 存在
    const productListBody = document.getElementById('productListBody');
    if (productListBody) {
        productListBody.appendChild(productRow);
    }
    
    // 关闭现有产品选择弹窗并重置表单
    const selectExistingProductModal = document.getElementById('selectExistingProductModal');
    if (selectExistingProductModal) {
        selectExistingProductModal.style.display = 'none';
    }
    
    // 重置表单
    resetExistingProductForm();
}

// 计算综合单价
window.calculateAveragePrice = function(product, newPrice, newQuantity) {
    // 如果是新产品，直接使用新单价
    if (product.totalStock === 0) {
        return newPrice;
    }
    
    // 计算加权平均价
    const totalValue = (product.averagePrice * product.totalStock) + (newPrice * newQuantity);
    const newTotalStock = product.totalStock + newQuantity;
    return totalValue / newTotalStock;
}

// 处理采购申请提交
function handlePurchaseApplySubmit() {
    // 获取表单数据
    const operator = applyOperator.innerHTML.trim();
    const date = applyDate.value;
    
    // 获取所有产品行
    const productRows = document.querySelectorAll('.product-row');
    const products = [];
    
    // 检查是否有产品行
    if (productRows.length === 0) {
        alert('请添加至少一个产品！');
        return;
    }
    
    // 验证并收集产品数据
    for (let i = 0; i < productRows.length; i++) {
        const row = productRows[i];
        const productName = row.querySelector('.product-name').value.trim();
        const productType = row.querySelector('.product-type').value.trim();
        const productSpec = row.querySelector('.product-spec').value.trim();
        const productPrice = parseFloat(row.querySelector('.product-price').value) || 0;
        const northStock = parseInt(row.querySelector('.north-stock').value) || 0;
        const centralStock = parseInt(row.querySelector('.central-stock').value) || 0;
        const eastStock = parseInt(row.querySelector('.east-stock').value) || 0;
        const southwestStock = parseInt(row.querySelector('.southwest-stock').value) || 0;
        const totalStock = northStock + centralStock + eastStock + southwestStock;
        
        // 验证必填字段
        if (!productName || !productType || !productSpec) {
            alert(`请填写第${i + 1}行产品的完整信息！`);
            return;
        }
        
        if (totalStock <= 0) {
            alert(`第${i + 1}行产品的采购数量必须大于0！`);
            return;
        }
        
        // 允许单价为0或为空，总部综管员可以在审核时填写
        // if (productPrice <= 0) {
        //     alert(`第${i + 1}行产品的单价必须大于0！`);
        //     return;
        // }
        
        products.push({
            productName,
            productType,
            productSpec,
            price: productPrice,
            northStock,
            centralStock,
            eastStock,
            southwestStock,
            totalStock
        });
    }
    
    // 生成确认内容
    let confirmContent = `
        <h3>采购申请确认</h3>
        <p><strong>申请人：</strong>${operator}</p>
        <p><strong>申请时间：</strong>${formatDateTime(date)}</p>
        <p><strong>采购产品清单：</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">产品名称</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">产品类型</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">产品规格</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">单价</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">总数量</th>
            </tr>
    `;
    
    products.forEach(product => {
        confirmContent += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.productName}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.productType}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.productSpec}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">¥${product.price.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.totalStock}</td>
            </tr>
        `;
    });
    
    confirmContent += `</table>`;
    
    // 显示确认弹窗
    applyConfirmContent.innerHTML = confirmContent;
    
    // 保存产品数据到全局变量，供确认时使用
    window.pendingProducts = products;
    window.pendingOperator = operator;
    window.pendingDate = date;
    
    // 关闭采购申请模态框，打开确认弹窗
    purchaseApplyModal.style.display = 'none';
    applyConfirmModal.style.display = 'block';
}

// 处理采购申请确认
function handleApplyConfirm() {
    // 获取待处理的产品数据
    const products = window.pendingProducts || [];
    const operator = window.pendingOperator || '';
    const date = window.pendingDate || '';
    
    if (products.length === 0) {
        alert('没有待处理的采购申请！');
        return;
    }
    
    // 获取当前登录用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 分析涉及的片区
    const involvedAreas = new Set();
    products.forEach(product => {
        if (product.northStock > 0) involvedAreas.add('北片区');
        if (product.centralStock > 0) involvedAreas.add('中片区');
        if (product.eastStock > 0) involvedAreas.add('东片区');
        if (product.southwestStock > 0) involvedAreas.add('西南片区');
    });
    
    // 为每个涉及的片区创建采购申请
    const createdApplications = [];
    involvedAreas.forEach(area => {
        // 生成唯一的采购记录ID
        const purchaseId = `purchase_${Date.now()}_${Math.floor(Math.random() * 1000)}_${area}`;
        
        // 过滤出该片区相关的产品数据
        const areaProducts = products.map(product => {
            // 为每个产品创建该片区的版本
            let areaStock = 0;
            switch (area) {
                case '北片区':
                    areaStock = product.northStock;
                    break;
                case '中片区':
                    areaStock = product.centralStock;
                    break;
                case '东片区':
                    areaStock = product.eastStock;
                    break;
                case '西南片区':
                    areaStock = product.southwestStock;
                    break;
            }
            
            return {
                productName: product.productName,
                productType: product.productType,
                productSpec: product.productSpec,
                price: product.price,
                northStock: area === '北片区' ? product.northStock : 0,
                centralStock: area === '中片区' ? product.centralStock : 0,
                eastStock: area === '东片区' ? product.eastStock : 0,
                southwestStock: area === '西南片区' ? product.southwestStock : 0,
                totalStock: areaStock
            };
        }).filter(product => product.totalStock > 0);
        
        // 创建采购申请记录，状态为待审批
        const purchaseApplication = {
            purchaseId,
            operator,
            area: area,
            status: APPROVAL_STATUS.PENDING,
            products: areaProducts,
            applyDate: date,
            approvalHistory: []
        };
        
        // 添加到采购申请列表
        purchaseApplications.push(purchaseApplication);
        createdApplications.push(area);
    });
    
    // 保存采购申请到localStorage
    localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
    
    // 关闭确认弹窗
    applyConfirmModal.style.display = 'none';
    
    // 重置表单
    purchaseApplyForm.reset();
    // 清空产品列表
    productListBody.innerHTML = '';
    
    // 清除全局变量
    window.pendingProducts = null;
    window.pendingOperator = null;
    window.pendingDate = null;
    
    // 显示成功提示
    alert(`采购申请已提交，涉及片区：${Array.from(createdApplications).join('、')}，等待各片区长审批！`);
    
    // 更新审批工单红点提示
    checkApprovalRequests();
}

// 根据产品名称和规格打开出库模态框
function openOutStockModalByName(productName, productSpec) {
    // 根据产品名称和规格查找产品
    const productIndex = inventoryData.findIndex(item => 
        item.productName === productName && item.productSpec === productSpec
    );
    
    if (productIndex === -1) {
        alert('未找到该产品！');
        return;
    }
    
    openOutStockModal(productIndex);
}

// 打开出库模态框
function openOutStockModal(index) {
    const product = inventoryData[index];
    outProductIndex.value = index;
    outProductName.value = product.productName;
    outProductType.value = product.productType;
    outProductSpec.value = product.productSpec;
    
    // 获取当前登录用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // 自动填充出库人为登录账号
        outOperator.value = user.username;
        
        // 根据用户身份设置出库片区的选择权限
        const outAreaSelect = document.getElementById('outArea');
        outAreaSelect.innerHTML = '<option value="">请选择出库片区</option>';
        
        // 总部综管员不能出库
        if (user.identity === '总部综管员') {
            outAreaSelect.innerHTML = '<option value="">总部综管员不能出库</option>';
            outAreaSelect.disabled = true;
        } else if (user.identity === '片区长' || user.identity === '片区综管员') {
            // 片区用户只能选择自己的片区
            if (user.area) {
                outAreaSelect.innerHTML = `<option value="${user.area}">${user.area}</option>`;
                outAreaSelect.disabled = true;
            }
        } else {
            // 其他用户可以选择所有片区
            outAreaSelect.innerHTML = `
                <option value="">请选择出库片区</option>
                <option value="北一片区">北一片区</option>
                <option value="北二片区">北二片区</option>
                <option value="东片区">东片区</option>
                <option value="中片区">中片区</option>
                <option value="西南片区">西南片区</option>
                <option value="益丰">益丰</option>
            `;
            outAreaSelect.disabled = false;
        }
    }
    
    // 清空领用人列表
    document.getElementById('outRecipientsList').innerHTML = '';
    
    outStockModal.style.display = 'block';
}

// 添加领用人
function addRecipient() {
    const recipientsList = document.getElementById('outRecipientsList');
    const recipientCount = recipientsList.children.length;
    
    const recipientItem = document.createElement('div');
    recipientItem.className = 'recipient-item';
    recipientItem.innerHTML = `
        <div style="display: flex; gap: 10px; margin: 10px 0; align-items: center;">
            <input type="text" placeholder="领用人" class="recipient-name" style="flex: 1; padding: 5px;">
            <input type="number" placeholder="数量" class="recipient-quantity" min="1" style="width: 100px; padding: 5px;">
            <input type="text" placeholder="用途" class="recipient-purpose" style="flex: 1; padding: 5px;">
            <button type="button" onclick="removeRecipient(this)" style="padding: 5px 10px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
        </div>
    `;
    
    recipientsList.appendChild(recipientItem);
}

// 删除领用人
function removeRecipient(btn) {
    const recipientItem = btn.closest('.recipient-item');
    recipientItem.remove();
}

// 处理出库功能
function handleOutStockSubmit() {
    const index = parseInt(outProductIndex.value);
    const product = inventoryData[index];
    
    // 获取表单数据
    const operator = outOperator.value.trim();
    const date = outDate.value;
    const outArea = document.getElementById('outArea').value;
    
    // 检查是否选择了出库片区
    if (!outArea) {
        alert('请选择出库片区！');
        return;
    }
    
    // 获取领用人列表
    const recipientItems = document.querySelectorAll('.recipient-item');
    const recipients = [];
    
    recipientItems.forEach((item, i) => {
        const name = item.querySelector('.recipient-name').value.trim();
        const quantity = parseInt(item.querySelector('.recipient-quantity').value) || 0;
        const purpose = item.querySelector('.recipient-purpose').value.trim();
        
        if (name && quantity > 0) {
            recipients.push({ name, quantity, purpose });
        }
    });
    
    // 检查是否有领用人
    if (recipients.length === 0) {
        alert('请至少添加一个领用人！');
        return;
    }
    
    // 计算领用人总数量
    const totalStock = recipients.reduce((sum, recipient) => sum + recipient.quantity, 0);
    
    // 检查库存是否足够
    let areaStock = 0;
    switch (outArea) {
        case '北片区':
            areaStock = product.northStock;
            break;
        case '中片区':
            areaStock = product.centralStock;
            break;
        case '东片区':
            areaStock = product.eastStock;
            break;
        case '西南片区':
            areaStock = product.southwestStock;
            break;
    }
    
    if (totalStock > areaStock) {
        alert(`出库数量超过${outArea}当前库存！`);
        return;
    }
    
    // 更新库存
    switch (outArea) {
        case '北片区':
            inventoryData[index].northStock -= totalStock;
            break;
        case '中片区':
            inventoryData[index].centralStock -= totalStock;
            break;
        case '东片区':
            inventoryData[index].eastStock -= totalStock;
            break;
        case '西南片区':
            inventoryData[index].southwestStock -= totalStock;
            break;
    }
    inventoryData[index].totalStock -= totalStock;
    
    // 生成出库单ID
    const outStockId = `out_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 准备出库记录的片区数据
    const northStock = outArea === '北片区' ? -totalStock : 0;
    const centralStock = outArea === '中片区' ? -totalStock : 0;
    const eastStock = outArea === '东片区' ? -totalStock : 0;
    const southwestStock = outArea === '西南片区' ? -totalStock : 0;
    
    // 添加出入库记录
    const historyRecord = {
        outStockId,
        productName: product.productName,
        productType: product.productType,
        productSpec: product.productSpec,
        price: product.averagePrice, // 出库使用当前综合单价
        operationType: '出库',
        operator,
        operationTime: date,
        northStock: northStock, // 出库用负数表示
        centralStock: centralStock,
        eastStock: eastStock,
        southwestStock: southwestStock,
        totalStock: -totalStock,
        recipients: recipients,
        remark: `产品出库 - ${outArea}`
    };
    stockHistory.push(historyRecord);
    
    // 保存出入库记录
    saveStockHistory();
    
    // 保存库存数据到CSV文件
    saveInventoryData();
    
    // 重新渲染表格
    handleSearch();
    // 重新渲染出入库记录表格
    renderStockHistoryTable(stockHistory);
    
    // 关闭模态框并重置表单
    outStockModal.style.display = 'none';
    outStockForm.reset();
    const now = new Date();
    // 获取UTC时间并加上8小时（北京时间比UTC早8小时）
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    outDate.value = beijingTime.toISOString().slice(0, 16);
    
    // 显示成功提示
    alert('出库成功！');
}

// 根据产品名称和规格打开详情模态框
function openDetailModalByName(productName, productSpec) {
    // 根据产品名称和规格查找产品
    const productIndex = inventoryData.findIndex(item => 
        item.productName === productName && item.productSpec === productSpec
    );
    
    if (productIndex === -1) {
        alert('未找到该产品！');
        return;
    }
    
    openDetailModal(productIndex);
}

// 打开详情模态框
function openDetailModal(index) {
    const product = inventoryData[index];
    
    // 显示产品详细信息
    productDetail.innerHTML = `
        <h3>${product.productName} - 详细信息</h3>
        <div class="product-detail-info">
            <div class="product-detail-item">
                <span class="product-detail-label">产品类型</span>
                <span class="product-detail-value">${product.productType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品规格</span>
                <span class="product-detail-value">${product.productSpec}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北一片区</span>
                <span class="product-detail-value">${product.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">综合单价</span>
                <span class="product-detail-value">¥${product.averagePrice.toFixed(2)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北二片区</span>
                <span class="product-detail-value">${product.northStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">东片区</span>
                <span class="product-detail-value">${product.centralStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">中片区</span>
                <span class="product-detail-value">${product.eastStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">西南片区</span>
                <span class="product-detail-value">${product.southwestStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">单位</span>
                <span class="product-detail-value">${product.detail.unit}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">供应商</span>
                <span class="product-detail-value">${product.detail.supplier}</span>
            </div>
        </div>
    `;
    
    // 显示出入库记录
    const productHistory = stockHistory.filter(record => {
        // 直接匹配单个产品记录（如出库记录）
        if (record.productName === product.productName && 
            record.productType === product.productType && 
            record.productSpec === product.productSpec) {
            return true;
        }
        // 处理包含多个产品的采购入库记录
        if (record.operationType === '采购入库' && record.products) {
            return record.products.some(p => 
                p.productName === product.productName && 
                p.productType === product.productType && 
                p.productSpec === product.productSpec
            );
        }
        return false;
    });
    
    renderHistoryTable(productHistory);
    
    // 打开详情模态框
    detailModal.style.display = 'block';
}

// 渲染历史记录表格
function renderHistoryTable(historyData) {
    historyTableBody.innerHTML = '';
    
    if (historyData.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">暂无出入库记录</td></tr>';
        return;
    }
    
    // 按时间倒序排序
    const sortedHistory = [...historyData].sort((a, b) => new Date(b.operationTime) - new Date(a.operationTime));
    
    sortedHistory.forEach((record, index) => {
            const row = document.createElement('tr');
            
            // 处理包含多个产品的采购入库记录
            let productInfo = record;
            if (record.operationType === '采购入库' && record.products) {
                // 从products数组中找到当前产品的信息
                // 这里假设我们只显示与当前产品相关的信息
                // 注意：这个实现可能需要根据实际情况调整
                // 因为我们没有当前产品的信息，所以我们需要假设记录中的产品信息
                // 实际上，我们应该在调用renderHistoryTable时传递当前产品的信息
                // 或者修改函数以处理这种情况
                // 为了简单起见，我们这里只显示记录的基本信息
            }
            
            // 格式化单价，显示¥符号和两位小数
            const formattedPrice = productInfo.price ? `¥${parseFloat(productInfo.price).toFixed(2)}` : '-';
            
            // 只有采购入库记录才显示查看按钮
            const operationButton = record.operationType === '采购入库' ? 
                `<button class="action-btn detail-btn" onclick="viewPurchaseDetail(${index})" style="padding: 4px 8px; font-size: 12px;">查看</button>` : '';
            
            row.innerHTML = `
                <td>${record.operationType}</td>
                <td>${formatDateTime(record.operationTime)}</td>
                <td>${record.operator}</td>
                <td>${formattedPrice}</td>
                <td>${record.northStock > 0 ? '+' : ''}${record.northStock}</td>
                <td>${record.centralStock > 0 ? '+' : ''}${record.centralStock}</td>
                <td>${record.eastStock > 0 ? '+' : ''}${record.eastStock}</td>
                <td>${record.southwestStock > 0 ? '+' : ''}${record.southwestStock}</td>
                <td>${record.remark}</td>
                <td>${operationButton}</td>
            `;
            historyTableBody.appendChild(row);
        });
}

// 查看采购详情
function viewPurchaseDetail(index) {
    // 从当前产品历史记录中获取对应索引的记录
    const record = window.currentProductHistory[index];
    if (!record) {
        alert('未找到采购记录！');
        return;
    }
    
    // 保存当前记录ID，用于后续文档管理
    window.currentPurchaseRecord = record;
    
    // 获取产品信息
    let productName = record.productName;
    let productType = record.productType;
    let productSpec = record.productSpec;
    
    // 处理包含多个产品的采购入库记录
    // 只有当记录没有直接的产品信息时，才从products数组中获取
    if (!productName || !productType || !productSpec) {
        if (record.operationType === '采购入库' && record.products && record.products.length > 0) {
            // 从products数组中找到第一个产品
            const product = record.products[0];
            if (product) {
                productName = product.productName;
                productType = product.productType;
                productSpec = product.productSpec;
            }
        }
    }
    
    // 生成采购详情内容
    const detailContent = `
        <div class="product-detail-info">
            <div class="product-detail-item">
                <span class="product-detail-label">操作类型</span>
                <span class="product-detail-value">${record.operationType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作时间</span>
                <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作人</span>
                <span class="product-detail-value">${record.operator}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品名称</span>
                <span class="product-detail-value">${productName}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品类型</span>
                <span class="product-detail-value">${productType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品规格</span>
                <span class="product-detail-value">${productSpec}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">单价</span>
                <span class="product-detail-value">¥${parseFloat(record.price).toFixed(2)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北一片区数量</span>
                <span class="product-detail-value">${record.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北二片区数量</span>
                <span class="product-detail-value">${record.northStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">东片区数量</span>
                <span class="product-detail-value">${record.centralStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">中片区数量</span>
                <span class="product-detail-value">${record.eastStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">西南片区数量</span>
                <span class="product-detail-value">${record.southwestStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">总数量</span>
                <span class="product-detail-value">${record.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">备注</span>
                <span class="product-detail-value">${record.remark}</span>
            </div>
        </div>
    `;
    
    purchaseDetailContent.innerHTML = detailContent;
    
    // 填充修改表单
    modifyProductName.value = record.productName;
    modifyProductType.value = record.productType;
    modifyProductSpec.value = record.productSpec;
    modifyProductPrice.value = parseFloat(record.price).toFixed(2);
    
    // 加载文档列表
    loadDocuments(record);
    
    // 打开采购详情模态框
    purchaseDetailModal.style.display = 'block';
}

// 查看出库详情
function viewOutStockDetail(outStockId) {
    // 找到对应的出库记录
    const record = stockHistory.find(r => r.outStockId === outStockId);
    if (!record) {
        alert('未找到出库记录！');
        return;
    }
    
    // 生成出库详情内容
    let detailContent = `
        <div class="product-detail-info">
            <div class="product-detail-item">
                <span class="product-detail-label">操作类型</span>
                <span class="product-detail-value">${record.operationType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作时间</span>
                <span class="product-detail-value">${formatDateTime(record.operationTime)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">操作人</span>
                <span class="product-detail-value">${record.operator}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品名称</span>
                <span class="product-detail-value">${record.productName}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品类型</span>
                <span class="product-detail-value">${record.productType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品规格</span>
                <span class="product-detail-value">${record.productSpec}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">单价</span>
                <span class="product-detail-value">¥${parseFloat(record.price).toFixed(2)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北一片区数量</span>
                <span class="product-detail-value">${record.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北二片区数量</span>
                <span class="product-detail-value">${record.northStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">东片区数量</span>
                <span class="product-detail-value">${record.centralStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">中片区数量</span>
                <span class="product-detail-value">${record.eastStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">西南片区数量</span>
                <span class="product-detail-value">${record.southwestStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">总数量</span>
                <span class="product-detail-value">${record.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">备注</span>
                <span class="product-detail-value">${record.remark}</span>
            </div>
        </div>
    `;
    
    // 添加领用人信息
    if (record.recipients && record.recipients.length > 0) {
        detailContent += `
            <div class="purchase-products-list" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <h3>领用人详情</h3>
                <table class="history-table" style="width: 100%; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>领用人</th>
                            <th>数量</th>
                            <th>用途</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        record.recipients.forEach(recipient => {
            detailContent += `
                <tr>
                    <td>${recipient.name}</td>
                    <td>${recipient.quantity}</td>
                    <td>${recipient.purpose || '-'}</td>
                </tr>
            `;
        });
        
        detailContent += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    purchaseDetailContent.innerHTML = detailContent;
    
    // 隐藏修改表单和资料上传部分
    const modifySection = document.querySelector('.modify-product-section');
    const documentsSection = document.querySelector('.purchase-documents');
    if (modifySection) modifySection.style.display = 'none';
    if (documentsSection) documentsSection.style.display = 'none';
    
    // 打开采购详情模态框
    purchaseDetailModal.style.display = 'block';
}

// 加载文档列表
function loadDocuments(record) {
    // 生成记录键
    let recordKey;
    if (record.purchaseId) {
        // 新的数据结构，使用purchaseId作为键
        recordKey = record.purchaseId;
    } else {
        // 旧的数据结构
        recordKey = `${record.productName}_${record.productType}_${record.productSpec}_${record.operationTime}`;
    }
    
    // 从localStorage获取文档列表
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    const recordDocuments = documents[recordKey] || [];
    
    // 显示文档列表
    if (recordDocuments.length === 0) {
        documentsList.innerHTML = '<p>暂无采购资料</p>';
        return;
    }
    
    let documentsHtml = '<ul style="list-style: none; padding: 0;">';
    recordDocuments.forEach((doc, index) => {
        documentsHtml += `
            <li style="margin: 8px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${doc.name}</span>
                    <button type="button" onclick="viewDocument('${recordKey}', ${index})" style="padding: 4px 8px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">查看</button>
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    上传时间: ${formatDateTime(doc.uploadTime)} | 大小: ${formatFileSize(doc.size)}
                </div>
            </li>
        `;
    });
    documentsHtml += '</ul>';
    documentsList.innerHTML = documentsHtml;
}

// 查看文档
function viewDocument(recordKey, docIndex) {
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    const recordDocuments = documents[recordKey] || [];
    const doc = recordDocuments[docIndex];
    
    if (doc) {
        // 创建临时链接打开文档
        const blob = new Blob([base64ToBlob(doc.content, doc.type)], { type: doc.type });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
}

// 处理资料上传
function handleDocumentUpload() {
    const files = documentUpload.files;
    if (files.length === 0) {
        alert('请选择要上传的文件！');
        return;
    }
    
    const record = window.currentPurchaseRecord;
    if (!record) {
        alert('未找到当前采购记录！');
        return;
    }
    
    // 获取现有文档
    const documents = JSON.parse(localStorage.getItem('purchaseDocuments')) || {};
    const recordKey = `${record.productName}_${record.productType}_${record.productSpec}_${record.operationTime}`;
    let recordDocuments = documents[recordKey] || [];
    
    // 处理每个文件
    const filesArray = Array.from(files);
    let uploadedCount = 0;
    
    filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Content = e.target.result.split(',')[1];
            
            // 添加文档到列表
            const newDoc = {
                name: file.name,
                type: file.type,
                size: file.size,
                content: base64Content,
                uploadTime: getBeijingTimeISOString()
            };
            
            recordDocuments.push(newDoc);
            uploadedCount++;
            
            // 全部上传完成后保存并刷新列表
            if (uploadedCount === filesArray.length) {
                documents[recordKey] = recordDocuments;
                localStorage.setItem('purchaseDocuments', JSON.stringify(documents));
                
                // 刷新文档列表
                loadDocuments(record);
                
                // 清空文件输入
                documentUpload.value = '';
                
                alert('文件上传成功！');
            }
        };
        reader.readAsDataURL(file);
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
}

// base64转Blob对象
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

// 获取北京时间的ISO字符串
function getBeijingTimeISOString() {
    const now = new Date();
    // 获取UTC时间并加上8小时（北京时间比UTC早8小时）
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString();
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    // 使用北京时间（UTC+8）
    return date.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}



// 在打开详情模态框时保存当前产品历史记录
function openDetailModal(index) {
    const product = inventoryData[index];
    
    // 显示产品详细信息
    productDetail.innerHTML = `
        <h3>${product.productName} - 详细信息</h3>
        <div class="product-detail-info">
            <div class="product-detail-item">
                <span class="product-detail-label">产品类型</span>
                <span class="product-detail-value">${product.productType}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">产品规格</span>
                <span class="product-detail-value">${product.productSpec}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北一片区</span>
                <span class="product-detail-value">${product.totalStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">综合单价</span>
                <span class="product-detail-value">¥${product.averagePrice.toFixed(2)}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">北二片区</span>
                <span class="product-detail-value">${product.northStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">东片区</span>
                <span class="product-detail-value">${product.centralStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">中片区</span>
                <span class="product-detail-value">${product.eastStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">西南片区</span>
                <span class="product-detail-value">${product.southwestStock}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">单位</span>
                <span class="product-detail-value">${product.detail.unit}</span>
            </div>
            <div class="product-detail-item">
                <span class="product-detail-label">供应商</span>
                <span class="product-detail-value">${product.detail.supplier}</span>
            </div>
        </div>
    `;
    
    // 显示出入库记录
    const productHistory = [];
    
    stockHistory.forEach(record => {
        // 直接匹配单个产品记录（如出库记录）
        if (record.productName === product.productName && 
            record.productType === product.productType && 
            record.productSpec === product.productSpec) {
            productHistory.push(record);
        }
        // 处理包含多个产品的采购入库记录
        else if (record.operationType === '采购入库' && record.products) {
            // 检查记录中是否包含当前产品
            const hasCurrentProduct = record.products.some(p => 
                p.productName === product.productName && 
                p.productType === product.productType && 
                p.productSpec === product.productSpec
            );
            
            if (hasCurrentProduct) {
                // 为当前产品创建一个简化的记录
                const productInRecord = record.products.find(p => 
                    p.productName === product.productName && 
                    p.productType === product.productType && 
                    p.productSpec === product.productSpec
                );
                
                if (productInRecord) {
                    // 创建一个新的记录对象，包含当前产品的信息
                    const simplifiedRecord = {
                        ...record,
                        productName: productInRecord.productName || product.productName,
                        productType: productInRecord.productType || product.productType,
                        productSpec: productInRecord.productSpec || product.productSpec,
                        price: productInRecord.price || productInRecord.productPrice,
                        northStock: productInRecord.northStock,
                        centralStock: productInRecord.centralStock,
                        eastStock: productInRecord.eastStock,
                        southwestStock: productInRecord.southwestStock,
                        totalStock: productInRecord.totalStock
                    };
                    productHistory.push(simplifiedRecord);
                }
            }
        }
    });
    
    // 保存当前产品历史记录，供查看采购详情使用
    window.currentProductHistory = productHistory;
    
    renderHistoryTable(productHistory);
    
    // 打开详情模态框
    detailModal.style.display = 'block';
}

// 初始化采购申请数据
function initPurchaseApplications() {
    // 从本地存储加载采购申请
    const storedApplications = localStorage.getItem('purchaseApplications');
    if (storedApplications) {
        try {
            purchaseApplications = JSON.parse(storedApplications);
        } catch (error) {
            // 如果解析失败，使用空数组
            purchaseApplications = [];
        }
    } else {
        // 如果本地存储没有数据，使用空数组
        purchaseApplications = [];
    }
}

// 加载待审批列表
function loadApprovalList() {
    // 重新获取approvalList元素，确保它指向正确的DOM元素
    approvalList = document.getElementById('approvalList');
    
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 获取当前登录用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('用户未登录，请重新登录！');
        return;
    }
    
    // 根据用户角色筛选待审批的申请
    let filteredApplications = [];
    
    switch (user.identity) {
        case '片区长':
            // 片区长可以审批本片区的采购申请
            filteredApplications = purchaseApplications.filter(app => 
                app.status === APPROVAL_STATUS.PENDING && 
                app.area === user.area
            );
            break;
        case '总部综管员':
            // 总部综管员可以审批所有已通过片区长审批的申请，同时也能查看自己的申请（包括被拒绝的）
            filteredApplications = purchaseApplications.filter(app => 
                app.status === APPROVAL_STATUS.AREA_MANAGER_APPROVED ||
                (app.operator === user.username && (app.status === APPROVAL_STATUS.AREA_MANAGER_REJECTED || app.status === APPROVAL_STATUS.HEADQUARTERS_REJECTED))
            );
            break;
        default:
            // 片区综管员只能查看自己的申请
            filteredApplications = purchaseApplications.filter(app => 
                app.operator === user.username
            );
    }
    
    // 按申请时间倒序排序（最新的在前）
    filteredApplications.sort((a, b) => new Date(b.applyDate) - new Date(a.applyDate));
    
    // 显示审批列表
    displayApprovalList(filteredApplications, user);
}

function loadInStockList() {
    // 重新获取inStockList元素，确保它指向正确的DOM元素
    inStockList = document.getElementById('inStockList');
    
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 获取当前登录用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('用户未登录，请重新登录！');
        return;
    }
    
    // 根据用户角色筛选待入库的申请
    let filteredApplications = [];
    
    console.log('当前用户:', user);
    console.log('所有采购申请:', purchaseApplications);
    
    switch (user.identity) {
        case '总部综管员':
            // 总部综管员可以看到所有待入库的申请
            filteredApplications = purchaseApplications.filter(app => 
                app.status === APPROVAL_STATUS.HEADQUARTERS_APPROVED
            );
            break;
        case '片区综管员':
            // 片区综管员只能看到自己片区的待入库申请
            filteredApplications = purchaseApplications.filter(app => 
                app.status === APPROVAL_STATUS.HEADQUARTERS_APPROVED &&
                app.area === user.area
            );
            break;
        case '片区长':
            // 片区长可以看到自己片区的待入库申请
            filteredApplications = purchaseApplications.filter(app => 
                app.status === APPROVAL_STATUS.HEADQUARTERS_APPROVED &&
                app.area === user.area
            );
            break;
    }
    
    console.log('待入库申请数量:', filteredApplications.length);
    console.log('待入库申请:', filteredApplications);
    
    // 按申请时间倒序排序（最新的在前）
    filteredApplications.sort((a, b) => new Date(b.applyDate) - new Date(a.applyDate));
    
    // 显示待入库列表
    displayInStockList(filteredApplications, user);
}

// 显示待入库列表
function displayInStockList(applications, user) {
    if (applications.length === 0) {
        inStockList.innerHTML = '<p>暂无待入库的采购申请</p>';
        return;
    }
    
    let inStockHtml = '';
    
    applications.forEach(app => {
        inStockHtml += `
            <div class="approval-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                <div class="approval-header" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
                    <h4>申请编号: ${app.purchaseId}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p><strong>申请人:</strong> ${app.operator}</p>
                        <p><strong>申请时间:</strong> ${formatDateTime(app.applyDate)}</p>
                        <p><strong>申请片区:</strong> ${app.area}</p>
                        <p><strong>入库时间:</strong> ${formatDateTime(app.inStockTime)}</p>
                        <p><strong>当前状态:</strong> ${getStatusText(app.status)}</p>
                    </div>
                    <div>
                        <button onclick="handleApproval('${app.purchaseId}', 'complete')" class="btn btn-submit">确认入库</button>
                    </div>
                    </div>
                </div>
                <div class="approval-products">
                    <h5>采购产品清单（可修改各片区入库数量）</h5>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 8px; border: 1px solid #ddd;">产品名称</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">产品类型</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">产品规格</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">单价</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">北一片区</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">北二片区</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">东片区</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">中片区</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">西南片区</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">益丰</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${app.products.map((product, index) => {
                                const price = parseFloat(product.price) || 0;
                                return `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productName}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productType}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productSpec}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">¥${price.toFixed(2)}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="nfStock-${app.purchaseId}-${index}" 
                                                   value="${product.totalStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="nStock-${app.purchaseId}-${index}" 
                                                   value="${product.northStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="eStock-${app.purchaseId}-${index}" 
                                                   value="${product.eastStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="cStock-${app.purchaseId}-${index}" 
                                                   value="${product.centralStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="swStock-${app.purchaseId}-${index}" 
                                                   value="${product.southwestStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            <input type="number" 
                                                   id="yfStock-${app.purchaseId}-${index}" 
                                                   value="${product.yiFengStock || 0}" 
                                                   step="1" 
                                                   min="0" 
                                                   style="width: 70px; padding: 4px;">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    inStockList.innerHTML = inStockHtml;
}

// 显示审批列表
function displayApprovalList(applications, user) {
    if (applications.length === 0) {
        approvalList.innerHTML = '<p>暂无待审批的采购申请</p>';
        return;
    }
    
    let approvalHtml = '';
    
    applications.forEach(app => {
        approvalHtml += `
            <div class="approval-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
                <div class="approval-header" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0;">
                    <h4>申请编号: ${app.purchaseId}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p><strong>申请人:</strong> ${app.operator}</p>
                        <p><strong>申请时间:</strong> ${formatDateTime(app.applyDate)}</p>
                        <p><strong>申请片区:</strong> ${app.area}</p>
                        <p><strong>当前状态:</strong> ${getStatusText(app.status)}</p>
                        ${(app.status === APPROVAL_STATUS.AREA_MANAGER_REJECTED || app.status === APPROVAL_STATUS.HEADQUARTERS_REJECTED) && app.approvals ? `
                            <p><strong>拒绝原因:</strong> ${app.approvals.find(a => a.action === 'reject')?.reason || '未提供原因'}</p>
                        ` : ''}
                    </div>
                    <div>
                        ${user.identity === '片区长' && app.status === APPROVAL_STATUS.PENDING ? `
                            <button onclick="handleApproval('${app.purchaseId}', 'approve')" class="btn btn-submit" style="margin-right: 10px;">同意</button>
                            <button onclick="handleApproval('${app.purchaseId}', 'reject')" class="btn btn-cancel">拒绝</button>
                        ` : ''}
                        ${user.identity === '总部综管员' && app.status === APPROVAL_STATUS.AREA_MANAGER_APPROVED ? `
                            <div style="margin-bottom: 10px;">
                                <label for="inStockTime-${app.purchaseId}">入库时间:</label>
                                <input type="datetime-local" id="inStockTime-${app.purchaseId}" value="${new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)}" required>
                            </div>
                            <button onclick="handleApproval('${app.purchaseId}', 'approve')" class="btn btn-submit" style="margin-right: 10px;">同意</button>
                            <button onclick="handleApproval('${app.purchaseId}', 'reject')" class="btn btn-cancel">拒绝</button>
                        ` : ''}
                        ${(user.identity === '片区综管员' || user.identity === '总部综管员') && app.operator === user.username && (app.status === APPROVAL_STATUS.AREA_MANAGER_REJECTED || app.status === APPROVAL_STATUS.HEADQUARTERS_REJECTED) ? `
                            <button onclick="editRejectedApplication('${app.purchaseId}')" class="btn btn-submit" style="margin-right: 10px;">调整</button>
                            <button onclick="deleteRejectedApplication('${app.purchaseId}')" class="btn btn-cancel">删除</button>
                        ` : ''}

                    </div>
                    </div>
                </div>
                <div class="approval-products">
                    <h5>采购产品清单</h5>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 8px; border: 1px solid #ddd;">产品名称</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">产品类型</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">产品规格</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">单价</th>
                                <th style="padding: 8px; border: 1px solid #ddd;">总数量</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${app.products.map((product, index) => {
                                const price = parseFloat(product.price) || 0;
                                return `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productName}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productType}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.productSpec}</td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">
                                            ${user.identity === '总部综管员' && app.status === APPROVAL_STATUS.AREA_MANAGER_APPROVED ? `
                                                <input type="number" id="price-${app.purchaseId}-${index}" value="${price}" step="0.01" min="0" style="width: 80px; padding: 4px;">
                                            ` : `¥${price.toFixed(2)}`}
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #ddd;">${product.totalStock}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    approvalList.innerHTML = approvalHtml;
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case APPROVAL_STATUS.PENDING:
            return '待片区长审批';
        case APPROVAL_STATUS.AREA_MANAGER_APPROVED:
            return '待总部综管员审批';
        case APPROVAL_STATUS.HEADQUARTERS_APPROVED:
            return '待入库';
        case APPROVAL_STATUS.AREA_MANAGER_REJECTED:
            return '片区长已拒绝';
        case APPROVAL_STATUS.HEADQUARTERS_REJECTED:
            return '总部已拒绝';
        case APPROVAL_STATUS.COMPLETED:
            return '已完成采购';
        default:
            return '未知状态';
    }
}

// 处理审批操作
function handleApproval(purchaseId, action) {
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 找到对应的采购申请
    const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
    if (appIndex === -1) {
        alert('未找到采购申请！');
        return;
    }
    
    const app = purchaseApplications[appIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    switch (action) {
        case 'approve':
            // 片区长同意审批
            if (user.identity === '片区长' && app.status === APPROVAL_STATUS.PENDING) {
                app.status = APPROVAL_STATUS.AREA_MANAGER_APPROVED;
                app.approvals = app.approvals || [];
                app.approvals.push({
                    approver: user.username,
                    identity: user.identity,
                    action: 'approve',
                    time: getBeijingTimeISOString()
                });
                alert('审批成功！');
            } else if (user.identity === '总部综管员' && app.status === APPROVAL_STATUS.AREA_MANAGER_APPROVED) {
                // 读取修改后的单价值
                app.products.forEach((product, productIndex) => {
                    const priceInput = document.getElementById(`price-${app.purchaseId}-${productIndex}`);
                    if (priceInput) {
                        const newPrice = parseFloat(priceInput.value) || 0;
                        product.price = newPrice;
                    }
                });
                
                // 检查所有产品的单价不可以为0
                const zeroPriceProducts = app.products.filter(product => !product.price || product.price <= 0);
                if (zeroPriceProducts.length > 0) {
                    alert('所有产品的单价必须大于0，请填写正确的单价！');
                    return;
                }
                
                // 读取选择的入库时间
                const inStockTimeInput = document.getElementById(`inStockTime-${app.purchaseId}`);
                let inStockTime = getBeijingTimeISOString();
                if (inStockTimeInput) {
                    inStockTime = new Date(inStockTimeInput.value).toISOString();
                }
                
                // 总部综管员批准后进入待入库状态，不直接完成采购
                app.status = APPROVAL_STATUS.HEADQUARTERS_APPROVED;
                app.inStockTime = inStockTime;
                app.approvals = app.approvals || [];
                app.approvals.push({
                    approver: user.username,
                    identity: user.identity,
                    action: 'approve',
                    time: inStockTime
                });
                
                alert('审批成功！请点击"入库"按钮完成采购入库。');
            } else {
                alert('您没有权限执行此操作！');
                return;
            }
            break;
        case 'reject':
            // 打开拒绝原因输入模态框
            openRejectionReasonModal(purchaseId, user.identity, app.status);
            break;
        case 'complete':
            // 完成采购入库（总部综管员、片区综管员、片区长都可以执行）
            if (app.status === APPROVAL_STATUS.HEADQUARTERS_APPROVED) {
                // 检查权限：总部综管员可以入库所有申请，片区综管员和片区长只能入库自己片区的申请
                const hasPermission = (user.identity === '总部综管员') || 
                                      ((user.identity === '片区综管员' || user.identity === '片区长') && app.area === user.area);
                
                if (!hasPermission) {
                    alert('您没有权限执行此操作！');
                    return;
                }
                
                // 读取用户修改的各片区入库数量
                let allQtyValid = true;
                let totalQty = 0;
                
                app.products.forEach((product, index) => {
                    const nfQty = parseInt(document.getElementById(`nfStock-${purchaseId}-${index}`)?.value) || 0;
                    const nQty = parseInt(document.getElementById(`nStock-${purchaseId}-${index}`)?.value) || 0;
                    const eQty = parseInt(document.getElementById(`eStock-${purchaseId}-${index}`)?.value) || 0;
                    const cQty = parseInt(document.getElementById(`cStock-${purchaseId}-${index}`)?.value) || 0;
                    const swQty = parseInt(document.getElementById(`swStock-${purchaseId}-${index}`)?.value) || 0;
                    const yfQty = parseInt(document.getElementById(`yfStock-${purchaseId}-${index}`)?.value) || 0;
                    
                    if (nfQty < 0 || nQty < 0 || eQty < 0 || cQty < 0 || swQty < 0 || yfQty < 0) {
                        allQtyValid = false;
                    }
                    
                    product.totalStock = nfQty;
                    product.northStock = nQty;
                    product.eastStock = eQty;
                    product.centralStock = cQty;
                    product.southwestStock = swQty;
                    product.yiFengStock = yfQty;
                    
                    totalQty += nfQty + nQty + eQty + cQty + swQty + yfQty;
                });
                
                if (!allQtyValid) {
                    alert('入库数量不能为负数！');
                    return;
                }
                
                // 检查是否所有产品的入库数量都为0
                if (totalQty === 0) {
                    alert('至少有一个产品的入库数量必须大于0！');
                    return;
                }
                
                app.status = APPROVAL_STATUS.COMPLETED;
                app.approvals = app.approvals || [];
                app.approvals.push({
                    approver: user.username,
                    identity: user.identity,
                    action: 'complete',
                    time: getBeijingTimeISOString()
                });
                
                // 处理采购入库，使用之前保存的入库时间
                processPurchase(app, app.inStockTime);
                
                // 关闭入库管理模态框
                inStockModal.style.display = 'none';
                
                // 重新加载库存清单
                loadInventoryData();
                
                alert('采购入库完成！');
            } else {
                alert('申请状态不正确，无法入库！');
                return;
            }
            break;
    }
    
    // 保存采购申请到本地存储
    localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
    
    // 重新加载审批列表
    loadApprovalList();
}

// 编辑被拒绝的采购申请
function editRejectedApplication(purchaseId) {
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 找到对应的采购申请
    const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
    if (appIndex === -1) {
        alert('未找到采购申请！');
        return;
    }
    
    const app = purchaseApplications[appIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 验证用户权限
    if (app.operator !== user.username) {
        alert('您没有权限编辑此采购申请！');
        return;
    }
    
    // 创建编辑模态框内容
    let modalContent = `
        <div style="padding: 20px;">
            <h3>修改采购申请 - ${app.purchaseId}</h3>
            <form id="editApplicationForm">
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 8px; border: 1px solid #ddd;">产品名称</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">产品类型</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">产品规格</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">单价</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">北一片区数量</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">北二片区数量</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">东片区数量</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">中片区数量</th>
                            <th style="padding: 8px; border: 1px solid #ddd;">西南片区数量</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${app.products.map((product, index) => {
                            const price = parseFloat(product.price) || 0;
                            return `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${product.productName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${product.productType}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${product.productSpec}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">¥${price.toFixed(2)}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <input type="number" 
                                               name="totalStock-${index}" 
                                               value="${product.totalStock || 0}" 
                                               step="1" 
                                               min="0" 
                                               style="width: 80px; padding: 4px;">
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <input type="number" 
                                               name="northStock-${index}" 
                                               value="${product.northStock || 0}" 
                                               step="1" 
                                               min="0" 
                                               style="width: 80px; padding: 4px;">
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <input type="number" 
                                               name="centralStock-${index}" 
                                               value="${product.centralStock || 0}" 
                                               step="1" 
                                               min="0" 
                                               style="width: 80px; padding: 4px;">
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <input type="number" 
                                               name="eastStock-${index}" 
                                               value="${product.eastStock || 0}" 
                                               step="1" 
                                               min="0" 
                                               style="width: 80px; padding: 4px;">
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">
                                        <input type="number" 
                                               name="southwestStock-${index}" 
                                               value="${product.southwestStock || 0}" 
                                               step="1" 
                                               min="0" 
                                               style="width: 80px; padding: 4px;">
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button type="button" onclick="closeEditModal()" class="btn btn-cancel">取消</button>
                    <button type="submit" class="btn btn-submit">保存修改并重新提交</button>
                </div>
            </form>
        </div>
    `;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'editApplicationModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContentDiv = document.createElement('div');
    modalContentDiv.style.cssText = `
        background-color: white;
        border-radius: 8px;
        width: 90%;
        max-width: 1000px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    modalContentDiv.innerHTML = modalContent;
    modal.appendChild(modalContentDiv);
    document.body.appendChild(modal);
    
    // 保存当前申请索引，供表单提交时使用
    window.currentEditingAppIndex = appIndex;
    
    // 绑定表单提交事件
    document.getElementById('editApplicationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const app = purchaseApplications[window.currentEditingAppIndex];
        
        // 更新产品数量
        app.products.forEach((product, index) => {
            const northStockInput = document.querySelector(`input[name="northStock-${index}"]`);
            const centralStockInput = document.querySelector(`input[name="centralStock-${index}"]`);
            const eastStockInput = document.querySelector(`input[name="eastStock-${index}"]`);
            const southwestStockInput = document.querySelector(`input[name="southwestStock-${index}"]`);
            
            if (northStockInput) {
                product.northStock = parseInt(northStockInput.value) || 0;
            }
            if (centralStockInput) {
                product.centralStock = parseInt(centralStockInput.value) || 0;
            }
            if (eastStockInput) {
                product.eastStock = parseInt(eastStockInput.value) || 0;
            }
            if (southwestStockInput) {
                product.southwestStock = parseInt(southwestStockInput.value) || 0;
            }
            
            // 重新计算总数量
            product.totalStock = (product.northStock || 0) + (product.centralStock || 0) + (product.eastStock || 0) + (product.southwestStock || 0);
        });
        
        // 将状态改回待审批
        app.status = APPROVAL_STATUS.PENDING;
        
        // 添加修改记录
        app.approvals = app.approvals || [];
        app.approvals.push({
            approver: user.username,
            identity: user.identity,
            action: 'edited',
            time: getBeijingTimeISOString()
        });
        
        // 保存采购申请到本地存储
        localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
        
        // 关闭模态框
        closeEditModal();
        
        // 重新加载审批列表
        loadApprovalList();
        
        alert('采购申请已修改并重新提交审批！');
    });
}

// 关闭编辑模态框
function closeEditModal() {
    const modal = document.getElementById('editApplicationModal');
    if (modal) {
        modal.remove();
    }
    window.currentEditingAppIndex = null;
}

// 删除被拒绝的采购申请
function deleteRejectedApplication(purchaseId) {
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 找到对应的采购申请
    const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
    if (appIndex === -1) {
        alert('未找到采购申请！');
        return;
    }
    
    const app = purchaseApplications[appIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 验证用户权限
    if (app.operator !== user.username) {
        alert('您没有权限删除此采购申请！');
        return;
    }
    
    // 确认删除
    if (!confirm('确定要删除此被拒绝的采购申请吗？此操作不可恢复。')) {
        return;
    }
    
    // 从数组中删除申请
    purchaseApplications.splice(appIndex, 1);
    
    // 保存采购申请到本地存储
    localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
    
    // 重新加载审批列表
    loadApprovalList();
    
    alert('被拒绝的采购申请已删除！');
}

// 打开拒绝原因输入模态框
function openRejectionReasonModal(purchaseId, userIdentity, currentStatus) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'rejectionReasonModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContentDiv = document.createElement('div');
    modalContentDiv.style.cssText = `
        background-color: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        padding: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    modalContentDiv.innerHTML = `
        <h3>填写拒绝原因</h3>
        <p style="margin-top: 10px; margin-bottom: 20px;">请输入拒绝此采购申请的原因：</p>
        <textarea id="rejectionReason" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button onclick="closeRejectionReasonModal()" class="btn btn-cancel">取消</button>
            <button onclick="submitRejectionReason('${purchaseId}', '${userIdentity}', '${currentStatus}')" class="btn btn-submit">提交</button>
        </div>
    `;
    
    modal.appendChild(modalContentDiv);
    document.body.appendChild(modal);
}

// 关闭拒绝原因模态框
function closeRejectionReasonModal() {
    const modal = document.getElementById('rejectionReasonModal');
    if (modal) {
        modal.remove();
    }
}

// 提交拒绝原因
function submitRejectionReason(purchaseId, userIdentity, currentStatus) {
    // 获取拒绝原因
    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
        alert('请填写拒绝原因！');
        return;
    }
    
    // 初始化采购申请数据
    initPurchaseApplications();
    
    // 找到对应的采购申请
    const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
    if (appIndex === -1) {
        alert('未找到采购申请！');
        return;
    }
    
    const app = purchaseApplications[appIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 验证权限和状态
    let canReject = false;
    let newStatus = '';
    
    if (userIdentity === '片区长' && currentStatus === APPROVAL_STATUS.PENDING) {
        canReject = true;
        newStatus = APPROVAL_STATUS.AREA_MANAGER_REJECTED;
    } else if (userIdentity === '总部综管员' && currentStatus === APPROVAL_STATUS.AREA_MANAGER_APPROVED) {
        canReject = true;
        newStatus = APPROVAL_STATUS.HEADQUARTERS_REJECTED;
    }
    
    if (!canReject) {
        alert('您没有权限执行此操作！');
        closeRejectionReasonModal();
        return;
    }
    
    // 更新状态和审批历史
    app.status = newStatus;
    app.approvals = app.approvals || [];
    app.approvals.push({
        approver: user.username,
        identity: user.identity,
        action: 'reject',
        reason: reason,
        time: getBeijingTimeISOString()
    });
    
    // 保存采购申请到本地存储
    localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
    
    // 关闭模态框
    closeRejectionReasonModal();
    
    // 重新加载审批列表
    loadApprovalList();
    
    alert('审批已拒绝！');
}

// 处理采购入库
window.processPurchase = function(application, inStockTime) {
    // 生成唯一的采购记录ID
    const purchaseId = `purchase_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 保存当前状态，用于回滚
    const originalInventoryData = JSON.parse(JSON.stringify(inventoryData));
    const originalStockHistory = JSON.parse(JSON.stringify(stockHistory));
    
    try {
        // 处理每个产品并更新库存
        application.products.forEach(product => {
            const { productName, productType, productSpec, price, totalStock, northStock, eastStock, centralStock, southwestStock, yiFengStock } = product;
            
            // 计算所有片区的总数量
            const allAreaTotal = (totalStock || 0) + (northStock || 0) + (eastStock || 0) + (centralStock || 0) + (southwestStock || 0) + (yiFengStock || 0);
            
            // 检查是否已有相同产品
            const existingProductIndex = inventoryData.findIndex(item => 
                item.productName === productName && 
                item.productType === productType && 
                item.productSpec === productSpec
            );
            
            if (existingProductIndex >= 0) {
                // 更新现有产品库存和综合单价
                const existingProduct = inventoryData[existingProductIndex];
                
                // 计算新的综合单价
                const newAveragePrice = calculateAveragePrice(existingProduct, price, allAreaTotal);
                
                // 更新库存（所有片区）
                existingProduct.totalStock += (totalStock || 0);
                existingProduct.northStock += (northStock || 0);
                existingProduct.eastStock += (eastStock || 0);
                existingProduct.centralStock += (centralStock || 0);
                existingProduct.southwestStock += (southwestStock || 0);
                existingProduct.yiFengStock += (yiFengStock || 0);
                existingProduct.averagePrice = newAveragePrice;
                
                // 记录价格历史
                existingProduct.priceHistory.push({
                    price: price,
                    quantity: allAreaTotal,
                    operationTime: inStockTime || getBeijingTimeISOString(),
                    operator: application.operator
                });
            } else {
                // 添加新产品
                // 从物品管理数据中查找对应的itemId，同时考虑产品名称和规格
                const itemInfo = itemManagementData.find(imItem => 
                    imItem.itemName === productName && 
                    imItem.itemModel === productSpec
                );
                
                const newProduct = {
                    itemId: itemInfo ? itemInfo.itemId : null, // 关联物品管理的itemId
                    productName,
                    productType,
                    productSpec,
                    productCategory: itemInfo ? itemInfo.category : "固定资产", // 从物品管理获取类别
                    totalStock: totalStock || 0,
                    northStock: northStock || 0,
                    eastStock: eastStock || 0,
                    centralStock: centralStock || 0,
                    southwestStock: southwestStock || 0,
                    yiFengStock: yiFengStock || 0,
                    averagePrice: price, // 新产品的综合单价就是当前单价
                    priceHistory: [{
                        price: price,
                        quantity: allAreaTotal,
                        operationTime: inStockTime || getBeijingTimeISOString(),
                        operator: application.operator
                    }],
                    detail: {
                        unit: '件',
                        supplier: '未知供应商'
                    }
                };
                inventoryData.push(newProduct);
            }
        });
        
        // 创建包含多个产品的采购记录
        const historyRecord = {
            purchaseId,
            operationType: '采购入库',
            operator: application.operator,
            operationTime: inStockTime || application.applyDate, // 使用传入的入库时间或申请时间作为操作时间
            products: application.products.map(product => ({
                productName: product.productName,
                productType: product.productType,
                productSpec: product.productSpec,
                price: product.price,
                northStock: product.northStock,
                centralStock: product.centralStock,
                eastStock: product.eastStock,
                southwestStock: product.southwestStock,
                totalStock: product.totalStock
            })),
            remark: '产品采购入库'
        };
        stockHistory.push(historyRecord);
        
        // 保存出入库记录
        saveStockHistory();
        
        // 保存库存数据到CSV文件
        saveInventoryData();
        
        // 重新渲染表格
        handleSearch();
        handleStockHistorySearch();
    } catch (error) {
        // 发生错误，回滚到原始状态
        inventoryData = originalInventoryData;
        stockHistory = originalStockHistory;
        throw error; // 重新抛出错误，让调用者处理
    }
}

// 导出函数（可选，用于其他模块调用）
window.inventoryApp = {
    resetSearch
};

// 全局函数：批准采购申请
window.approvePurchase = function(purchaseId) {
    // 找到触发事件的按钮元素
    const btnElement = event.target;
    // 禁用按钮，防止重复点击
    btnElement.disabled = true;
    btnElement.textContent = '处理中...';
    
    try {
        // 初始化采购申请数据
        initPurchaseApplications();
        
        // 找到对应的采购申请
        const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
        if (appIndex === -1) {
            alert('未找到采购申请！');
            return;
        }
        
        const app = purchaseApplications[appIndex];
        const user = JSON.parse(localStorage.getItem('user'));
        
        // 读取修改后的数量值
        app.products.forEach((product, productIndex) => {
            const quantityInput = document.getElementById(`quantity-${purchaseId}-${productIndex}`);
            if (quantityInput) {
                const newQuantity = parseInt(quantityInput.value) || 0;
                product.totalStock = newQuantity;
                // 更新各片区库存（保持比例不变）
                const totalStock = newQuantity;
                const northRatio = product.northStock / product.totalStock || 0;
                const centralRatio = product.centralStock / product.totalStock || 0;
                const eastRatio = product.eastStock / product.totalStock || 0;
                const southwestRatio = product.southwestStock / product.totalStock || 0;
                
                product.northStock = Math.round(totalStock * northRatio);
                product.centralStock = Math.round(totalStock * centralRatio);
                product.eastStock = Math.round(totalStock * eastRatio);
                product.southwestStock = Math.round(totalStock * southwestRatio);
            }
        });
        
        // 根据用户身份处理审批
        if (user.identity === '片区长') {
            // 片区长批准，更新状态为片区长已批准
            app.status = APPROVAL_STATUS.AREA_MANAGER_APPROVED;
            app.approvalHistory = app.approvalHistory || [];
            app.approvalHistory.push({
                approver: user.username,
                identity: user.identity,
                action: 'approve',
                time: getBeijingTimeISOString()
            });
            
            // 保存更新后的采购申请
            localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
            
            // 移除当前审批项
            const approvalItem = btnElement.closest('.approval-item');
            if (approvalItem) {
                approvalItem.remove();
            }
            
            // 检查是否还有其他待审批项
            const remainingItems = document.querySelectorAll('.approval-item');
            if (remainingItems.length === 0) {
                approvalList.innerHTML = '<p>暂无待审批的采购申请</p>';
            }
            
            alert('审批成功！采购申请已通过片区长批准，等待总部综管员审批。');
        } else if (user.identity === '总部综管员') {
            // 处理采购入库
            processPurchase(app);
            
            // 只有当入库成功后，才保存审批历史和更新状态
            app.approvalHistory = app.approvalHistory || [];
            app.approvalHistory.push({
                approver: user.username,
                identity: user.identity,
                action: 'approve',
                time: getBeijingTimeISOString()
            });
            
            // 更新状态为已完成
            app.status = APPROVAL_STATUS.COMPLETED;
            
            // 保存更新后的采购申请
            localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
            
            // 移除当前审批项
            const approvalItem = btnElement.closest('.approval-item');
            if (approvalItem) {
                approvalItem.remove();
            }
            
            // 检查是否还有其他待审批项
            const remainingItems = document.querySelectorAll('.approval-item');
            if (remainingItems.length === 0) {
                approvalList.innerHTML = '<p>暂无待审批的采购申请</p>';
            }
            
            alert('审批成功！采购申请已完成，库存已更新。');
            // 更新审批工单红点提示
            checkApprovalRequests();
        } else {
            alert('您没有权限审批此申请！');
        }
    } catch (error) {
        alert('审批失败，请重试！');
    } finally {
        // 恢复按钮状态
        btnElement.disabled = false;
        btnElement.textContent = '同意';
    }
};

// 打开库存转移模态框
function openTransferStockModal(productName, productSpec) {
    const productIndex = inventoryData.findIndex(item => 
        item.productName === productName && 
        item.productSpec === productSpec
    );
    
    if (productIndex === -1) {
        alert('未找到产品！');
        return;
    }
    
    const product = inventoryData[productIndex];
    window.currentTransferProductIndex = productIndex;
    
    document.getElementById('transferProductName').value = productName;
    document.getElementById('transferProductSpec').value = productSpec;
    
    document.getElementById('transferSourceStock').value = '';
    document.getElementById('transferTargetStock').value = '';
    
    transferStockModal.style.display = 'block';
}

// 获取片区库存值
function getAreaStock(product, areaKey) {
    switch (areaKey) {
        case 'northFirst':
            return product.totalStock || 0;
        case 'north':
            return product.northStock || 0;
        case 'east':
            return product.eastStock || 0;
        case 'central':
            return product.centralStock || 0;
        case 'southwest':
            return product.southwestStock || 0;
        case 'yiFeng':
            return product.yiFengStock || 0;
        default:
            return 0;
    }
}

// 设置片区库存值
function setAreaStock(product, areaKey, value) {
    switch (areaKey) {
        case 'northFirst':
            product.totalStock = value;
            break;
        case 'north':
            product.northStock = value;
            break;
        case 'east':
            product.eastStock = value;
            break;
        case 'central':
            product.centralStock = value;
            break;
        case 'southwest':
            product.southwestStock = value;
            break;
        case 'yiFeng':
            product.yiFengStock = value;
            break;
    }
}

// 获取片区显示名称
function getAreaDisplayName(areaKey) {
    switch (areaKey) {
        case 'northFirst':
            return '北一片区';
        case 'north':
            return '北二片区';
        case 'east':
            return '东片区';
        case 'central':
            return '中片区';
        case 'southwest':
            return '西南片区';
        case 'yiFeng':
            return '益丰';
        default:
            return areaKey;
    }
}

// 更新源片区库存显示
function updateTransferSourceStock() {
    const sourceArea = transferSourceArea.value;
    const product = inventoryData[window.currentTransferProductIndex];
    
    if (product && sourceArea) {
        document.getElementById('transferSourceStock').value = getAreaStock(product, sourceArea);
    } else {
        document.getElementById('transferSourceStock').value = '';
    }
    
    updateTransferMaxQuantity();
}

// 更新目标片区库存显示
function updateTransferTargetStock() {
    const targetArea = transferTargetArea.value;
    const product = inventoryData[window.currentTransferProductIndex];
    
    if (product && targetArea) {
        document.getElementById('transferTargetStock').value = getAreaStock(product, targetArea);
    } else {
        document.getElementById('transferTargetStock').value = '';
    }
}

// 更新转移数量最大值
function updateTransferMaxQuantity() {
    const sourceArea = transferSourceArea.value;
    const product = inventoryData[window.currentTransferProductIndex];
    
    if (product && sourceArea) {
        const maxQuantity = getAreaStock(product, sourceArea);
        document.getElementById('transferQuantity').max = maxQuantity;
    } else {
        document.getElementById('transferQuantity').max = '';
    }
}

// 处理库存转移提交
function handleTransferStockSubmit(e) {
    e.preventDefault();
    
    const sourceArea = transferSourceArea.value;
    const targetArea = transferTargetArea.value;
    const quantity = parseInt(document.getElementById('transferQuantity').value) || 0;
    const remark = document.getElementById('transferRemark').value.trim();
    
    if (!sourceArea) {
        alert('请选择源片区！');
        return;
    }
    
    if (!targetArea) {
        alert('请选择目标片区！');
        return;
    }
    
    if (sourceArea === targetArea) {
        alert('源片区和目标片区不能相同！');
        return;
    }
    
    if (quantity <= 0) {
        alert('转移数量必须大于0！');
        return;
    }
    
    const productIndex = window.currentTransferProductIndex;
    const product = inventoryData[productIndex];
    
    const sourceStock = getAreaStock(product, sourceArea);
    if (quantity > sourceStock) {
        alert(`转移数量超过${getAreaDisplayName(sourceArea)}库存！`);
        return;
    }
    
    const targetStock = getAreaStock(product, targetArea);
    
    setAreaStock(product, sourceArea, sourceStock - quantity);
    setAreaStock(product, targetArea, targetStock + quantity);
    
    const transferId = `transfer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const historyRecord = {
        transferId,
        productName: product.productName,
        productType: product.productType,
        productSpec: product.productSpec,
        operationType: '库存转移',
        operator: JSON.parse(localStorage.getItem('user')).username,
        operationTime: getBeijingTimeISOString(),
        sourceArea: getAreaDisplayName(sourceArea),
        targetArea: getAreaDisplayName(targetArea),
        quantity: quantity,
        remark: remark || `从${getAreaDisplayName(sourceArea)}转移到${getAreaDisplayName(targetArea)}`
    };
    stockHistory.push(historyRecord);
    
    saveStockHistory();
    saveInventoryData();
    
    handleSearch();
    renderStockHistoryTable(stockHistory);
    
    transferStockModal.style.display = 'none';
    transferStockForm.reset();
    
    alert(`库存转移成功！已将${quantity}个${product.productName}从${getAreaDisplayName(sourceArea)}转移到${getAreaDisplayName(targetArea)}。`);
}

// 全局函数：拒绝采购申请
window.rejectPurchase = function(purchaseId) {
    // 找到触发事件的按钮元素
    const btnElement = event.target;
    // 禁用按钮，防止重复点击
    btnElement.disabled = true;
    btnElement.textContent = '处理中...';
    
    try {
        // 初始化采购申请数据
        initPurchaseApplications();
        
        // 找到对应的采购申请
        const appIndex = purchaseApplications.findIndex(app => app.purchaseId === purchaseId);
        if (appIndex === -1) {
            alert('未找到采购申请！');
            return;
        }
        
        const app = purchaseApplications[appIndex];
        const user = JSON.parse(localStorage.getItem('user'));
        
        // 根据用户身份处理拒绝
        if (user.identity === '片区长') {
            // 片区长拒绝，更新状态为片区长已拒绝
            app.status = APPROVAL_STATUS.AREA_MANAGER_REJECTED;
            app.approvalHistory = app.approvalHistory || [];
            app.approvalHistory.push({
                approver: user.username,
                identity: user.identity,
                action: 'reject',
                time: getBeijingTimeISOString()
            });
        } else if (user.identity === '总部综管员') {
            // 总部综管员拒绝，更新状态为总部已拒绝
            app.status = APPROVAL_STATUS.HEADQUARTERS_REJECTED;
            app.approvalHistory = app.approvalHistory || [];
            app.approvalHistory.push({
                approver: user.username,
                identity: user.identity,
                action: 'reject',
                time: getBeijingTimeISOString()
            });
        } else {
            alert('您没有权限拒绝此申请！');
            return;
        }
        
        // 保存更新后的采购申请
        localStorage.setItem('purchaseApplications', JSON.stringify(purchaseApplications));
        
        // 移除当前审批项
        const approvalItem = btnElement.closest('.approval-item');
        if (approvalItem) {
            approvalItem.remove();
        }
        
        // 检查是否还有其他待审批项
        const remainingItems = document.querySelectorAll('.approval-item');
        if (remainingItems.length === 0) {
            approvalList.innerHTML = '<p>暂无待审批的采购申请</p>';
        }
        
        alert('审批已拒绝！');
        // 更新审批工单红点提示
        checkApprovalRequests();
    } catch (error) {
        alert('拒绝审批失败，请重试！');
    } finally {
        // 恢复按钮状态
        btnElement.disabled = false;
        btnElement.textContent = '拒绝';
    }
}