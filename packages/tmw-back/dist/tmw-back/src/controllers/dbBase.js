"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const dbHelper_1 = require("./dbHelper");
const db_1 = require("../../../tmw-model/src/db");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class DbBase extends base_1.default {
    constructor(...args) {
        super(...args);
        this["dbHelper"] = new dbHelper_1.default(this);
    }
    async tmsBeforeEach() {
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        this["clMongoObj"] = this["dbHelper"].clMongoObj;
        return true;
    }
    async list() {
        const query = { type: 'database' };
        if (this["bucket"])
            query.bucket = this["bucket"].name;
        let { keyword } = this["request"].query;
        if (keyword) {
            if (/\(/.test(keyword)) {
                keyword = keyword.replace(/\(/g, '\\(');
            }
            if (/\)/.test(keyword)) {
                keyword = keyword.replace(/\)/g, '\\)');
            }
            let re = new RegExp(keyword);
            query['$or'] = [
                { name: { $regex: re, $options: 'i' } },
                { title: { $regex: re, $options: 'i' } },
                { description: { $regex: re, $options: 'i' } },
                { tag: { $regex: re, $options: 'i' } },
            ];
        }
        const options = {
            projection: { type: 0 },
            sort: { top: -1, _id: -1 },
        };
        let { skip, limit } = this["dbHelper"].requestPage();
        if (typeof skip === 'number') {
            options.skip = skip;
            options.limit = limit;
        }
        const tmwDbs = await this["clMongoObj"].find(query, options).toArray();
        if (typeof skip === 'number') {
            let total = await this["clMongoObj"].countDocuments(query);
            return new tms_koa_1.ResultData({ databases: tmwDbs, total });
        }
        return new tms_koa_1.ResultData(tmwDbs);
    }
    async create() {
        let info = this["request"].body;
        if (this["bucket"])
            info.bucket = this["bucket"].name;
        let [flag, result] = await this["dbHelper"].dbCreate(info);
        if (!flag) {
            return new tms_koa_1.ResultFault(result);
        }
        return new tms_koa_1.ResultData(result);
    }
    async update() {
        let info = this["request"].body;
        let modelDb = new db_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let newName;
        if (info.name !== undefined) {
            newName = modelDb.checkDbName(info.name);
            if (newName[0] === false)
                return new tms_koa_1.ResultFault(newName[1]);
            info.name = newName[1];
        }
        const queryList = { 'db.sysname': info.sysname, type: 'collection' };
        const updateList = { database: info.name, 'db.name': info.name };
        const rst = await this["clMongoObj"].updateMany(queryList, {
            $set: updateList,
        });
        let { _id, bucket, sysname, ...updatedInfo } = info;
        const query = { _id: new ObjectId(_id) };
        return this["clMongoObj"]
            .updateOne(query, { $set: updatedInfo })
            .then(() => new tms_koa_1.ResultData(info));
    }
    async top() {
        let { id, type = 'up' } = this["request"].query;
        let top = type === 'up' ? '10000' : null;
        const query = { _id: new ObjectId(id) };
        if (this["bucket"])
            query.bucket = this["bucket"].name;
        return this["clMongoObj"]
            .updateOne(query, { $set: { top } })
            .then((rst) => new tms_koa_1.ResultData(rst.result));
    }
}
exports.default = DbBase;
