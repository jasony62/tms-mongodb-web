"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentHelper = void 0;
const unrepeat_1 = require("./unrepeat");
const lodash_1 = require("lodash");
const fs = require("fs");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
const log4js = require("log4js");
const logger = log4js.getLogger('tms-mongodb-web');
const collection_1 = require("../../../tmw-model/src/collection");
const document_1 = require("../../../tmw-model/src/document");
const schema_1 = require("../../../tmw-model/src/schema");
const helper_1 = require("./helper");
class DocumentHelper extends helper_1.default {
    getRequestBatchQuery() {
        let { filter, docIds } = this.ctrl.request.body;
        let query, operation, errCause;
        if (Array.isArray(docIds) && docIds.length) {
            query = {
                _id: {
                    $in: docIds.map((id) => new ObjectId(id)),
                },
            };
            operation = '批量（按选中）';
        }
        else if (typeof filter === 'string' && /all/i.test(filter)) {
            query = {};
            operation = '批量（按全部）';
        }
        else if (typeof filter === 'object' && Object.keys(filter).length) {
            const modelDoc = new document_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
            query = modelDoc.assembleQuery(filter);
            operation = '批量（按条件）';
        }
        else {
            errCause = '无效的批量文档指定条件，未执行删除操作';
        }
        return { query, operation, errCause };
    }
    async importToColl(existCl, filename, noRepeatconfig, rowsJson = []) {
        const modelDoc = new document_1.default(this["mongoClient"], this.ctrl.bucket, this.ctrl.client, this["config"]);
        if (!rowsJson.length) {
            if (!fs.existsSync(filename))
                return [false, '指定的文件不存在'];
            const xlsx = require('tms-koa/node_modules/xlsx');
            const wb = xlsx.readFile(filename);
            const firstSheetName = wb.SheetNames[0];
            const sh = wb.Sheets[firstSheetName];
            rowsJson = xlsx.utils.sheet_to_json(sh);
        }
        let collModel = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let columns = await collModel.getSchemaByCollection(existCl);
        if (!columns)
            return [false, '指定的集合没有指定集合列'];
        let publicDoc = {};
        const { extensionInfo } = existCl;
        if (extensionInfo) {
            const { info, schemaId } = extensionInfo;
            if (schemaId) {
                const modelSchema = new schema_1.default(this["mongoClient"], this.ctrl.bucket, this["client"], this["config"]);
                const publicSchema = await modelSchema.bySchemaId(schemaId);
                Object.keys(publicSchema).forEach((schema) => {
                    publicDoc[schema] = info[schema] ? info[schema] : '';
                });
            }
        }
        let jsonFinishRows = rowsJson.map((row) => {
            let newRow = {};
            for (const k in columns) {
                let column = columns[k];
                let rDByTitle = row[column.title];
                if (typeof rDByTitle === 'number') {
                    newRow[k] = String(rDByTitle);
                }
                else if (typeof rDByTitle === 'undefined') {
                    if (column.type === 'string' &&
                        column.enum &&
                        column.enum.length &&
                        column.default &&
                        column.default.length) {
                        newRow[k] = column.enum.find((ele) => ele.value === column.default).label;
                    }
                    else if (column.type === 'array' &&
                        column.enum &&
                        column.enum.length &&
                        column.default &&
                        column.default.length) {
                        const target = column.enum.map((ele) => {
                            if (column.default.includes(ele.value)) {
                                return ele.label;
                            }
                        });
                        newRow[k] = target.join(',');
                    }
                    else {
                        newRow[k] = column.default || null;
                    }
                }
                else {
                    newRow[k] = rDByTitle;
                }
            }
            collModel.beforeProcessByInAndUp(newRow, 'insert');
            return newRow;
        });
        try {
            this.transformsCol('toValue', jsonFinishRows, columns);
            function getFailMsg(config, rows) {
                let msg = '';
                rows.forEach((data) => {
                    config.config.columns.forEach((key) => {
                        msg += data[key] + ',';
                    });
                });
                msg = msg.substr(0, msg.length - 1);
                return msg;
            }
            let failDatas = [];
            if (noRepeatconfig) {
                const newDocs = await (0, unrepeat_1.default)(this.ctrl, jsonFinishRows, noRepeatconfig);
                if (newDocs.length === 0)
                    return [false, `已全部存在或重复`];
                failDatas = lodash_1.default.difference(jsonFinishRows, newDocs);
                jsonFinishRows = newDocs;
            }
            if (publicDoc) {
                jsonFinishRows = jsonFinishRows.map((item) => Object.assign(item, publicDoc));
            }
            return this.findSysColl(existCl)
                .insertMany(jsonFinishRows)
                .then(() => {
                if (this["config"].TMS_APP_DATA_ACTION_LOG === 'Y') {
                    modelDoc.dataActionLog(jsonFinishRows, '导入', existCl.db.name, existCl.name);
                }
                if (failDatas.length) {
                    let failMsg = getFailMsg(noRepeatconfig, failDatas);
                    return [false, `${failMsg}已存在或重复`];
                }
                else {
                    return [true, '导入成功'];
                }
            });
        }
        catch (err) {
            logger.error('提取excel数据到集合中', err);
            return [false, err];
        }
    }
    transformsCol(model, data, columns) {
        let sourceData = JSON.parse(JSON.stringify(data));
        const gets = model === 'toLabel' ? 'value' : 'label';
        const sets = model === 'toLabel' ? 'label' : 'value';
        Object.keys(columns).forEach((ele) => {
            if (columns[ele].type === 'string' && data.length) {
                sourceData.forEach((item, index) => {
                    data[index][ele] =
                        data[index][ele] && data[index][ele].trim().replace(/\n/g, '');
                });
            }
            if (columns[ele].type === 'array' && columns[ele].enum) {
                sourceData.forEach((item, index) => {
                    if (model === 'toValue' && Array.isArray(item[ele]))
                        return data[index];
                    let arr = [];
                    let enums = model === 'toValue' && item[ele] && typeof item[ele] === 'string'
                        ? data[index][ele].split(',').filter((ele) => ele)
                        : data[index][ele];
                    if (enums && Array.isArray(enums)) {
                        if (model === 'toValue') {
                            enums = enums.map((ele) => ele.trim().replace(/\n/g, ''));
                        }
                        if (columns[ele].enumGroups && columns[ele].enumGroups.length) {
                            columns[ele].enumGroups
                                .filter((enumGroup) => {
                                if (enumGroup.assocEnum &&
                                    enumGroup.assocEnum.property &&
                                    enumGroup.assocEnum.value) {
                                    let currentVal = '';
                                    let property = enumGroup.assocEnum.property;
                                    if (model === 'toValue') {
                                        let filterEnum = columns[property].enum.filter((e) => e.label === item[property]);
                                        currentVal = filterEnum[0].value;
                                    }
                                    else {
                                        currentVal = item[property];
                                    }
                                    return currentVal === enumGroup.assocEnum.value;
                                }
                            })
                                .map((oEnumG) => {
                                columns[ele].enum.forEach((childItem) => {
                                    if (childItem.group === oEnumG.id &&
                                        enums.includes(childItem[gets])) {
                                        arr.push(childItem[sets]);
                                    }
                                });
                            });
                        }
                        else {
                            columns[ele].enum.forEach((childItem) => {
                                if (enums.includes(childItem[gets]))
                                    arr.push(childItem[sets]);
                            });
                        }
                        function enumFilter(item) {
                            let labels = columns[ele].enum.map((childItem) => childItem['label']);
                            if (!labels.includes(item))
                                return item;
                        }
                        const filterEnums = enums.filter(enumFilter);
                        if (model === 'toValue' && filterEnums.length) {
                            logger.info('存在差集', filterEnums);
                            throw '多选不匹配，导入失败';
                        }
                    }
                    if (model === 'toValue' && item[ele] && !arr.length) {
                        logger.info('非逗号间隔', item[ele], arr);
                        throw '多选不匹配，导入失败';
                    }
                    data[index][ele] = model === 'toLabel' ? arr.join(',') : arr;
                    return data[index];
                });
            }
            else if (columns[ele].type === 'string' && columns[ele].enum) {
                sourceData.forEach((item, index) => {
                    let labels = columns[ele].enum.map((ele) => ele.label);
                    let flag = labels.includes(item[ele]);
                    if (model === 'toValue' && item[ele] && !flag) {
                        logger.info('单选不匹配', labels);
                        throw '单选不匹配，导入失败';
                    }
                    columns[ele].enum.forEach((childItem) => {
                        if (item[ele] === childItem[gets])
                            data[index][ele] = childItem[sets];
                    });
                    return data[index];
                });
            }
        });
    }
    async cutDocs(oldDbName, oldClName, newDbName, newClName, oldDocus = null) {
        if (!oldDbName || !oldClName || !newDbName || !newClName) {
            return [false, '参数不完整'];
        }
        if (!oldDocus || oldDocus.length === 0)
            return [false, '没有要移动的数据'];
        let collModel = new collection_1.default(this["mongoClient"], this.ctrl.bucket, this["client"], this["config"]);
        const oldExistCl = await collModel.byName(oldDbName, oldClName);
        const newExistCl = await collModel.byName(newDbName, newClName);
        const modelDoc = new document_1.default(this["mongoClient"], this.ctrl.bucket, this.ctrl.client, this["config"]);
        const modelSchema = new schema_1.default(this["mongoClient"], this.ctrl.bucket, this["client"], this["config"]);
        let newClSchema = await collModel.getSchemaByCollection(newExistCl);
        if (!newClSchema)
            return [false, '指定的集合未指定集合列定义'];
        let newPublicDoc = {};
        let { extensionInfo } = newExistCl;
        if (extensionInfo) {
            const { info, schemaId } = extensionInfo;
            if (schemaId) {
                const publicSchema = await modelSchema.bySchemaId(schemaId);
                Object.keys(publicSchema).forEach((schema) => {
                    newPublicDoc[schema] = info[schema] ? info[schema] : '';
                });
            }
        }
        let newDocs = oldDocus.map((oldDoc) => {
            let newd = {
                _id: oldDoc._id,
            };
            for (const k in newClSchema) {
                if (!oldDoc[k]) {
                    newd[k] = newClSchema[k].default || '';
                }
                else {
                    newd[k] = oldDoc[k];
                }
            }
            modelDoc.beforeProcessByInAndUp(newd, 'insert');
            if (newPublicDoc)
                Object.assign(newd, newPublicDoc);
            return newd;
        });
        let newDocs2 = JSON.parse(JSON.stringify(newDocs)).map((newDoc) => {
            delete newDoc._id;
            return newDoc;
        });
        const client = this.ctrl.mongoClient;
        const clNew = client
            .db(newExistCl.db.sysname)
            .collection(newExistCl.sysname);
        let rst = await clNew
            .insertMany(newDocs2)
            .then((rst) => [true, rst])
            .catch((err) => [false, err.toString()]);
        if (rst[0] === false)
            return [false, '数据插入指定表错误: ' + rst[1]];
        rst = rst[1];
        if (rst.insertedCount != oldDocus.length) {
            Object.values(rst.insertedIds)
                .map((istId) => new ObjectId(istId))
                .forEach(async (oid) => {
                await clNew.deleteOne({
                    _id: oid,
                });
            });
            return [
                false,
                '插入数据数量错误需插入：' +
                    newDocs2.length +
                    '；实际插入：' +
                    rst.insertedCount,
            ];
        }
        const clOld = client
            .db(oldExistCl.db.sysname)
            .collection(oldExistCl.sysname);
        let passDocIds = [], moveOldDatas = {};
        oldDocus.forEach((oldDoc) => {
            passDocIds.push(new ObjectId(oldDoc._id));
            moveOldDatas[oldDoc._id] = oldDoc;
        });
        let rstDelOld = await clOld
            .deleteMany({
            _id: {
                $in: passDocIds,
            },
        })
            .then((rst) => [true, rst])
            .catch((err) => [false, err.toString()]);
        if (rstDelOld[0] === false)
            return [false, '数据以到指定集合中，但删除旧数据时失败'];
        rstDelOld = rstDelOld[1];
        let planMoveTotal = newDocs.length;
        let returnData = {
            planMoveTotal,
            rstInsNew: rst,
            rstDelOld,
            logInfo: {
                newDocs,
                oldDbName: oldExistCl.db.name,
                oldClName: oldExistCl.name,
                newDbName: newExistCl.db.name,
                newClName: newExistCl.name,
                moveOldDatas,
            },
        };
        return [true, returnData];
    }
}
exports.DocumentHelper = DocumentHelper;
exports.default = DocumentHelper;
