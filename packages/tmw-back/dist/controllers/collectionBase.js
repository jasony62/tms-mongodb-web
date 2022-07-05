"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionBase = void 0;
const ObjectId = require('mongodb').ObjectId;
const { ResultData, ResultFault } = require('tms-koa');
const base_1 = require("./base");
const collectionHelper_1 = require("./collectionHelper");
const replicaHelper_1 = require("./replicaHelper");
const tmw_model_1 = require("tmw-model");
class CollectionBase extends base_1.default {
    constructor(...args) {
        super(...args);
        this.clHelper = new collectionHelper_1.default(this);
        this.rpHelper = new replicaHelper_1.default(this);
    }
    async tmsBeforeEach() {
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        this.reqDb = await this.clHelper.findRequestDb();
        this.clMongoObj = this.clHelper.clMongoObj;
        return true;
    }
    async byName() {
        const existCl = await this.clHelper.findRequestCl();
        if (existCl.schema_id) {
            await this.clMongoObj
                .findOne({ type: 'schema', _id: new ObjectId(existCl.schema_id) })
                .then((schema) => {
                existCl.schema = schema;
                delete existCl.schema_id;
                return existCl;
            });
        }
        return new ResultData(existCl);
    }
    async list() {
        const query = { type: 'collection', 'db.sysname': this.reqDb.sysname };
        if (this.bucket)
            query.bucket = this.bucket.name;
        const { keyword } = this.request.query;
        if (keyword) {
            let re = new RegExp(keyword);
            query['$or'] = [
                { name: { $regex: re, $options: 'i' } },
                { title: { $regex: re, $options: 'i' } },
            ];
        }
        const options = {
            projection: { type: 0 },
        };
        let { skip, limit } = this.clHelper.requestPage();
        if (typeof skip === 'number') {
            options.skip = skip;
            options.limit = limit;
        }
        const tmwCls = await this.clMongoObj
            .find(query, options)
            .sort({ _id: -1 })
            .toArray();
        if (typeof skip === 'number') {
            let total = await this.clMongoObj.countDocuments(query);
            return new ResultData({ collections: tmwCls, total });
        }
        return new ResultData(tmwCls);
    }
    async create() {
        const info = this.request.body;
        if (this.bucket)
            info.bucket = this.bucket.name;
        if (!info.name)
            return new ResultFault('集合名称不允许为空');
        const existDb = this.reqDb;
        let [flag, result] = await this.clHelper.createCl(existDb, info);
        if (!flag) {
            return new ResultFault(result);
        }
        info._id = result.insertedId;
        return new ResultData(info);
    }
    async update() {
        const existCl = await this.clHelper.findRequestCl();
        let info = this.request.body;
        let { cl: clName } = this.request.query;
        let modelCl = new tmw_model_1.Collection();
        let newClName;
        if (info.name !== undefined && info.name !== existCl.name) {
            newClName = modelCl.checkClName(info.name);
            if (newClName[0] === false)
                return new ResultFault(newClName[1]);
            let existTmwCl = await modelCl.byName(this.reqDb, info.name);
            if (existTmwCl)
                return new ResultFault(`数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${info.name}]`);
        }
        if (newClName) {
            let otherCl = await modelCl.byName(this.reqDb, newClName);
            if (otherCl)
                return new ResultFault(`数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${newClName}]`);
        }
        const { _id, sysname, database, db, type, bucket, usage, ...updatedInfo } = info;
        const rst = await this.clMongoObj
            .updateOne({ _id: existCl._id }, { $set: updatedInfo })
            .then((rst) => [true, rst.result])
            .catch((err) => [false, err.message]);
        if (rst[0] === false)
            return new ResultFault(rst[1]);
        return new ResultData(info);
    }
    async remove() {
        const existCl = await this.clHelper.findRequestCl();
        let { db, name: clName, usage } = existCl;
        if ((db.sysname === 'admin' && clName === 'system.version') ||
            (db.sysname === 'config' && clName === 'system.sessions') ||
            (db.sysname === 'local' && clName === 'startup_log') ||
            (db.sysname === 'tms_admin' && clName === 'mongodb_object') ||
            (db.sysname === 'tms_admin' && clName === 'bucket') ||
            (db.sysname === 'tms_admin' && clName === 'bucket_invite_log') ||
            (db.sysname === 'tms_admin' && clName === 'bucket_preset_object') ||
            (db.sysname === 'tms_admin' && clName === 'tms_app_data_action_log') ||
            (db.sysname === 'tms_admin' && clName === 'replica_map'))
            return new ResultFault(`系统自带集合[${clName}]，不能删除`);
        if (usage !== undefined) {
            const [flag] = await this.rpHelper.byId(existCl);
            if (flag)
                return new ResultFault(`该集合存在关联关系不允许删除`);
        }
        const client = this.mongoClient;
        return this.clMongoObj
            .deleteOne({ _id: existCl._id })
            .then(() => client.db(this.reqDb.sysname).dropCollection(existCl.sysname))
            .then(() => new ResultData('ok'))
            .catch((err) => new ResultFault(err.message));
    }
}
exports.CollectionBase = CollectionBase;
exports.default = CollectionBase;
