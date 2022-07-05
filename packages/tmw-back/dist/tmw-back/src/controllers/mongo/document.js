"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const documentBase_1 = require("../documentBase");
const lodash_1 = require("lodash");
const collection_1 = require("../../../../tmw-model/src/collection");
const document_1 = require("../../../../tmw-model/src/document");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Document extends documentBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async uploadToImport() {
        if (!this["request"].files || !this["request"].files.file) {
            return new tms_koa_1.ResultFault('没有上传文件');
        }
        const existCl = await this["docHelper"].findRequestCl();
        const { UploadPlain } = require('tms-koa/lib/model/fs/upload');
        const { LocalFS } = require('tms-koa/lib/model/fs/local');
        const { FsContext } = require('tms-koa').Context;
        const file = this["request"].files.file;
        const fsContextIns = FsContext.insSync();
        const domain = fsContextIns.getDomain(fsContextIns.defaultDomain);
        const tmsFs = new LocalFS(domain);
        const upload = new UploadPlain(tmsFs);
        let filepath;
        try {
            filepath = await upload.store(file, '', 'Y');
        }
        catch (e) {
            return new tms_koa_1.ResultFault(e.message);
        }
        const { operateRules } = existCl;
        let noRepeatConfig = null;
        if (operateRules && operateRules.scope && operateRules.scope.unrepeat) {
            const { database: { name: dbName }, collection: { name: clName }, primaryKeys, insert, } = operateRules.unrepeat;
            noRepeatConfig = {
                config: {
                    columns: primaryKeys,
                    db: dbName,
                    cl: clName,
                    insert: insert,
                },
            };
        }
        let rst = await this["docHelper"].importToColl(existCl, filepath, noRepeatConfig);
        let result = null;
        if (rst[0] === true) {
            result = {
                importAll: true,
                message: `导入成功`,
            };
        }
        else {
            result = {
                importAll: false,
                message: `导入失败,${rst[1]}`,
            };
        }
        return new tms_koa_1.ResultData(result);
    }
    async export() {
        let { filter, docIds, columns } = this["request"].body;
        let modelDoc = new document_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let query;
        if (docIds && docIds.length > 0) {
            let docIds2 = docIds.map((id) => new ObjectId(id));
            query = { _id: { $in: docIds2 } };
        }
        else if (filter && typeof filter === 'object') {
            query = modelDoc.assembleQuery(filter);
        }
        else if (typeof filter === 'string' && filter === 'ALL') {
            query = {};
        }
        else {
            return new tms_koa_1.ResultFault('没有要导出的数据');
        }
        const existCl = await this["docHelper"].findRequestCl();
        let modelCl = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        columns = columns ? columns : await modelCl.getSchemaByCollection(existCl);
        if (!columns)
            return new tms_koa_1.ResultFault('指定的集合没有指定集合列');
        const client = this["mongoClient"];
        let data = await client
            .db(existCl.db.sysname)
            .collection(existCl.sysname)
            .find(query)
            .toArray();
        this["docHelper"].transformsCol('toLabel', data, columns);
        const { ExcelCtrl } = require('tms-koa/lib/controller/fs');
        let rst = ExcelCtrl.export(columns, data, existCl.name + '.xlsx');
        if (rst[0] === false)
            return new tms_koa_1.ResultFault(rst[1]);
        rst = rst[1];
        return new tms_koa_1.ResultData(rst);
    }
    async move() {
        let { oldDb, oldCl, newDb, newCl, execNum = 100, planTotal = 0, alreadyMoveTotal = 0, alreadyMovePassTotal = 0, } = this["request"].query;
        let { docIds, filter } = this["request"].body;
        if (!filter && (!Array.isArray(docIds) || docIds.length == 0)) {
            return new tms_koa_1.ResultFault('没有要移动的数据');
        }
        let modelCl = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let modelDoc = new document_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        const oldExistCl = await modelCl.byName(oldDb, oldCl);
        let oldDocus, total, operateType;
        if (docIds && docIds.length > 0) {
            oldDocus = await modelDoc.getDocumentByIds(oldExistCl, docIds, {});
            if (oldDocus[0] === false)
                return [false, oldDocus[1]];
            oldDocus = oldDocus[1];
            total = docIds.length;
            operateType = `批量（按选中）迁移`;
        }
        else {
            let query = {};
            let cl = this["docHelper"].findSysColl(oldExistCl);
            if (lodash_1.default.toUpper(filter) !== 'ALL') {
                query = modelDoc.assembleQuery(filter);
                operateType = `批量（按筛选）迁移`;
            }
            else {
                operateType = `批量（按全部）迁移`;
            }
            oldDocus = await cl.find(query).limit(parseInt(execNum)).toArray();
            total = await cl.find(query).count();
        }
        let rst = await this["docHelper"].cutDocs(oldDb, oldCl, newDb, newCl, oldDocus);
        if (rst[0] === false)
            return new tms_koa_1.ResultFault(rst[1]);
        rst = rst[1];
        if (planTotal == 0)
            planTotal = parseInt(total);
        alreadyMoveTotal = parseInt(alreadyMoveTotal) + parseInt(rst.planMoveTotal);
        let spareTotal = parseInt(planTotal) - alreadyMoveTotal;
        alreadyMovePassTotal =
            parseInt(alreadyMovePassTotal) + parseInt(rst.rstDelOld.result.n);
        let alreadyMoveFailTotal = alreadyMoveTotal - alreadyMovePassTotal;
        let data = {
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal,
            alreadyMoveFailTotal,
            spareTotal,
        };
        if (this["config"].TMS_APP_DATA_ACTION_LOG === 'Y') {
            let info = rst.logInfo;
            await modelDoc.dataActionLog(info.newDocs, operateType, info.oldDbName, info.oldClName, info.newDbName, info.newClName, oldDocus);
        }
        return new tms_koa_1.ResultData(data);
    }
}
exports.default = Document;
