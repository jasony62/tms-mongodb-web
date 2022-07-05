"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Document = void 0;
const mongodb = require("mongodb");
const base_1 = require("./base");
const collection_1 = require("./collection");
const dayjs = require("dayjs");
const ObjectId = mongodb.ObjectId;
class Document extends base_1.Base {
    byId(existCl, id) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname);
            let existDoc = yield sysCl.findOne({
                _id: new ObjectId(id),
            });
            return existDoc;
        });
    }
    remove(existCl, id) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname);
            const modelCl = new collection_1.Collection(this.mongoClient, this.bucket, this.client, this.config);
            let removeQuery, removeSysCl;
            if (existCl.usage !== 1) {
                removeSysCl = sysCl;
                removeQuery = { _id: new ObjectId(id) };
                yield modelCl.checkRemoveConstraint(existCl, removeQuery, sysCl);
            }
            else {
                let doc = yield sysCl.findOne({ _id: new ObjectId(id) });
                if (!doc)
                    return false;
                let { __pri } = doc;
                let priCl = mongoClient.db(__pri.db).collection(__pri.cl);
                let existPriCl = yield modelCl.bySysname({ sysname: __pri.db }, __pri.cl);
                removeQuery = { _id: __pri.id };
                yield modelCl.checkRemoveConstraint(existPriCl, removeQuery, priCl);
                removeSysCl = priCl;
            }
            const result = this.findUnRepeatRule(existCl);
            if (result[0] && result[1]["insert"]) {
                const dbSysName = result[1]["dbSysName"];
                const clSysName = result[1]["clSysName"];
                const keys = result[1]["keys"];
                const { targetSysCl, targetQuery } = yield this.getUnRepeatSQ(removeSysCl, removeQuery, dbSysName, clSysName, keys);
                targetSysCl.deleteMany(targetQuery);
            }
            return removeSysCl
                .deleteOne(removeQuery)
                .then(({ acknowledged, deletedCount }) => deletedCount === 1);
        });
    }
    removeMany(existCl, query) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname);
            const modelCl = new collection_1.Collection(this.mongoClient, this.bucket, this.client, this.config);
            if (existCl.usage !== 1) {
                const result = this.findUnRepeatRule(existCl);
                if (result[0] && result[1]["insert"]) {
                    const dbSysName = result[1]["dbSysName"];
                    const clSysName = result[1]["clSysName"];
                    const keys = result[1]["keys"];
                    const { targetSysCl, targetQuery } = yield this.getUnRepeatSQ(sysCl, query, dbSysName, clSysName, keys);
                    targetSysCl.deleteMany(targetQuery);
                }
                yield modelCl.checkRemoveConstraint(existCl, query, sysCl);
                return sysCl.deleteMany(query).then(({ deletedCount }) => deletedCount);
            }
            else {
                let removedDocs = yield sysCl
                    .find(query, { projection: { __pri: 1 } })
                    .toArray();
                if (removedDocs.length === 0)
                    return 0;
                let priIdsByCl = new Map();
                removedDocs.forEach(({ __pri }) => {
                    let priDbDotCl = `${__pri.db}.${__pri.cl}`;
                    if (!priIdsByCl.has(priDbDotCl))
                        priIdsByCl.set(priDbDotCl, []);
                    priIdsByCl.get(priDbDotCl).push(__pri.id);
                });
                for (const entry of priIdsByCl) {
                    let [dbDotCl, ids] = entry;
                    let [db, cl] = dbDotCl.split('.');
                    let sysCl = mongoClient.db(db).collection(cl);
                    let tmwCl = yield modelCl.bySysname({ sysname: db }, cl);
                    const result = this.findUnRepeatRule(tmwCl);
                    if (result[0]["flag"] && "insert") {
                        const dbSysName = result[1]["dbSysName"];
                        const clSysName = result[1]["clSysName"];
                        const keys = result[1]["keys"];
                        const insert = result[1]["insert"];
                        const { targetSysCl, targetQuery } = yield this.getUnRepeatSQ(sysCl, { _id: { $in: ids } }, dbSysName, clSysName, keys);
                        targetSysCl.deleteMany(targetQuery);
                    }
                    yield modelCl.checkRemoveConstraint(tmwCl, { _id: { $in: ids } }, sysCl);
                }
                let promises = [];
                priIdsByCl.forEach((ids, dbDotCl) => {
                    let [db, cl] = dbDotCl.split('.');
                    promises.push(mongoClient
                        .db(db)
                        .collection(cl)
                        .deleteMany({ _id: { $in: ids } })
                        .then(({ deletedCount }) => deletedCount));
                });
                return Promise.all(promises).then((deletedCounts) => deletedCounts.reduce((total, deletedCount) => total + deletedCount, 0));
            }
        });
    }
    copyMany(existCl, query, targetCl) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let existSysCl = mongoClient
                .db(existCl.db.sysname)
                .collection(existCl.sysname);
            let copyedDocs = yield existSysCl.find(query).toArray();
            if (copyedDocs.length === 0)
                return 0;
            let targetSysCl = mongoClient
                .db(targetCl.db.sysname)
                .collection(targetCl.sysname);
            let bulkOp = targetSysCl.initializeUnorderedBulkOp();
            for (let doc of copyedDocs) {
                let { _id } = doc, info = __rest(doc, ["_id"]);
                typeof info[this.config['TMS_APP_DEFAULT_CREATETIME']] !== 'undefined' &&
                    delete info[this.config['TMS_APP_DEFAULT_UPDATETIME']];
                typeof info[this.config['TMS_APP_DEFAULT_UPDATETIME']] !== 'undefined' &&
                    delete info[this.config['TMS_APP_DEFAULT_CREATETIME']];
                let isExistDoc = yield targetSysCl.findOne({ _id: doc._id });
                if (isExistDoc) {
                    this.beforeProcessByInAndUp(info, 'update');
                    bulkOp.find({ _id: doc._id }).updateOne({ $set: info });
                }
                else {
                    this.beforeProcessByInAndUp(info, 'insert');
                    bulkOp.find({ _id: doc._id }).upsert().updateOne({
                        $setOnInsert: info,
                    });
                }
            }
            return bulkOp.execute().then(({ nUpserted, nMatched, nModified }) => {
                return { nUpserted, nMatched, nModified };
            });
        });
    }
    update(existCl, id, updated) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname);
            if (existCl.usage !== 1) {
                return sysCl
                    .updateOne({
                    _id: new ObjectId(id),
                }, { $set: updated })
                    .then(({ modifiedCount }) => modifiedCount === 1);
            }
            else {
                let __pri;
                if (updated.__pri) {
                    __pri = updated.__pri;
                }
                else {
                    let doc = yield sysCl.findOne({ _id: new ObjectId(id) });
                    if (!doc)
                        return false;
                    __pri = doc.__pri;
                }
                let priCl = mongoClient.db(__pri.db).collection(__pri.cl);
                return priCl
                    .updateOne({ _id: new ObjectId(__pri.id) }, { $set: updated })
                    .then(({ modifiedCount }) => modifiedCount === 1);
            }
        });
    }
    updateMany(existCl, query, updated) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname);
            if (existCl.usage !== 1) {
                return sysCl
                    .updateMany(query, { $set: updated })
                    .then(({ modifiedCount }) => modifiedCount);
            }
            else {
                let updatedDocs = yield sysCl
                    .find(query, { projection: { __pri: 1 } })
                    .toArray();
                if (updatedDocs.length === 0)
                    return 0;
                let priIdsByCl = new Map();
                updatedDocs.forEach(({ __pri }) => {
                    let priDbDotCl = `${__pri.db}.${__pri.cl}`;
                    if (!priIdsByCl.has(priDbDotCl))
                        priIdsByCl.set(priDbDotCl, []);
                    priIdsByCl.get(priDbDotCl).push(__pri.id);
                });
                let promises = [];
                priIdsByCl.forEach((ids, dbDotCl) => {
                    let [db, cl] = dbDotCl.split('.');
                    promises.push(mongoClient
                        .db(db)
                        .collection(cl)
                        .updateMany({ _id: { $in: ids } }, { $set: updated })
                        .then(({ modifiedCount }) => modifiedCount));
                });
                return Promise.all(promises).then((modifiedCounts) => modifiedCounts.reduce((total, modifiedCount) => total + modifiedCount, 0));
            }
        });
    }
    list(existCl, filter = {}, orderBy = {}, page = 0, size = 0, like = true) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = filter ? this.assembleQuery(filter, like) : {};
            const client = yield this.mongoClient();
            let cl = client.db(existCl.db.sysname).collection(existCl.sysname);
            let { skip, limit } = this.toSkipAndLimit(page, size);
            let sort = {};
            if (orderBy && typeof orderBy === 'object' && Object.keys(orderBy).length) {
                for (const key in orderBy)
                    sort[key] = orderBy[key] === 'desc' ? -1 : 1;
            }
            else {
                sort["_id"] = -1;
            }
            let data = {};
            data["docs"] = yield cl
                .find(query)
                .skip(skip)
                .limit(limit)
                .sort(sort)
                .toArray()
                .then((docs) => __awaiter(this, void 0, void 0, function* () {
                return docs;
            }));
            data["total"] = yield cl.find(query).count();
            return [true, data];
        });
    }
    byIds(existCl, ids, fields = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!existCl || !ids)
                return [false, '参数不完整'];
            let docIds = ids.map((id) => new ObjectId(id));
            let query = { _id: { $in: docIds } };
            const client = yield this.mongoClient();
            const cl = client.db(existCl.db.sysname).collection(existCl.sysname);
            return cl
                .find(query)
                .project(fields)
                .toArray()
                .then((rst) => [true, rst])
                .catch((err) => [false, err.toString()]);
        });
    }
    count(existCl, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.mongoClient();
            const sysCl = client.db(existCl.db.sysname).collection(existCl.sysname);
            let total = yield sysCl.countDocuments(query);
            return total;
        });
    }
    dataActionLog(oDatas, operate_type, dbname, clname, operate_after_dbname = '', operate_after_clname = '', operate_before_data = null, client_info = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!operate_type || !dbname || !clname)
                return false;
            if (this.config.TMS_APP_DATA_ACTION_LOG !== 'Y')
                return true;
            if (dbname === 'tms_admin' && clname === 'tms_app_data_action_log')
                return false;
            let datas = JSON.parse(JSON.stringify(oDatas));
            if (!Array.isArray(datas)) {
                let dArr = [];
                dArr.push(datas);
                datas = dArr;
            }
            const client = yield this.mongoClient();
            const cl = client.db('tms_admin');
            let current = dayjs().format('YYYY-MM-DD HH:mm:ss');
            const cl2 = cl.collection('tms_app_data_action_log');
            if (operate_before_data && Array.isArray(operate_before_data)) {
                let newDatas = {};
                operate_before_data.forEach((od) => {
                    newDatas[od._id] = od;
                });
                operate_before_data = newDatas;
            }
            for (const data of datas) {
                if (data._id) {
                    data.operate_id = data._id;
                    delete data._id;
                }
                else {
                    data.operate_id = '';
                }
                data.operate_dbname = dbname;
                data.operate_clname = clname;
                data.operate_after_dbname = operate_after_dbname;
                data.operate_after_clname = operate_after_clname;
                data.operate_time = current;
                data.operate_type = operate_type;
                if (this.client && this.client.data) {
                    data.operate_account =
                        this.client.data.account || this.client.data['cust_id'];
                    data.operate_nickname = this.client.data.nickname;
                }
                if (client_info) {
                    data.operate_account =
                        client_info.operate_account || client_info['cust_id'];
                    data.operate_nickname = client_info.operate_nickname;
                }
                if (operate_before_data) {
                    if (typeof operate_before_data === 'object' &&
                        operate_before_data[data.operate_id]) {
                        data.operate_before_data = operate_before_data[data.operate_id];
                    }
                    else if (typeof operate_before_data === 'string') {
                        data.operate_before_data = operate_before_data;
                    }
                }
                else {
                    data.operate_before_data = '';
                }
                yield cl2.insertOne(data);
            }
            return true;
        });
    }
    getDocCompleteStatus(existCl, docs) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelCl = new collection_1.Collection(this.mongoClient, this.bucket, this.client, this.config);
            const clSchemas = yield modelCl.getSchemaByCollection(existCl);
            if (!clSchemas)
                return docs;
            docs.forEach((doc) => {
                let status = {
                    unCompleted: {},
                    completed: {},
                };
                for (const k in clSchemas) {
                    const v = clSchemas[k];
                    if (v.required === true) {
                        if ([undefined, '', null].includes(doc[k]))
                            status.unCompleted[k] = v;
                        else
                            status.completed[k] = v;
                    }
                    else
                        status.completed[k] = v;
                }
                doc.completeStatus = status;
            });
            return docs;
        });
    }
    getDocumentByIds(oldExistCl, ids, fields = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!oldExistCl || !ids) {
                return [false, '参数不完整'];
            }
            const client = yield this.mongoClient();
            const cl = client.db(oldExistCl.db.sysname).collection(oldExistCl.sysname);
            let docIds = [];
            ids.forEach((id) => {
                docIds.push(new ObjectId(id));
            });
            let find = { _id: { $in: docIds } };
            return cl
                .find(find)
                .project(fields)
                .toArray()
                .then((rst) => [true, rst])
                .catch((err) => [false, err.toString()]);
        });
    }
    findUnRepeatRule(existCl) {
        const { operateRules } = existCl;
        if (operateRules &&
            operateRules.scope &&
            operateRules.unrepeat &&
            operateRules.unrepeat.database &&
            operateRules.unrepeat.database.sysname) {
            const { database: { sysname: dbSysName, name: dbName }, collection: { sysname: clSysName, name: clName }, primaryKeys: keys, insert, } = operateRules.unrepeat;
            return [true, { dbSysName, dbName, clSysName, clName, keys, insert }];
        }
        else {
            return [
                false,
                {
                    dbSysName: null,
                    dbName: null,
                    clSysName: null,
                    clName: null,
                    keys: null,
                    insert: false,
                },
            ];
        }
    }
    getUnRepeatSQ(existSysCl, query, db, cl, keys) {
        return __awaiter(this, void 0, void 0, function* () {
            let mongoClient = yield this.mongoClient();
            let targetSysCl = mongoClient.db(db).collection(cl);
            const docs = yield existSysCl.find(query).toArray();
            let targetQuery = {};
            keys.forEach((key) => {
                let result = [];
                docs.forEach((doc) => result.push(doc[key]));
                targetQuery[key] = { $in: result };
            });
            return { targetSysCl, targetQuery };
        });
    }
}
exports.Document = Document;
//# sourceMappingURL=document.js.map