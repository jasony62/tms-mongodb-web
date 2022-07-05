"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const lodash_1 = require("lodash");
const schemaBase_1 = require("../schemaBase");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Schema extends schemaBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async list() {
        return super.list();
    }
    async listSimple() {
        return super.listSimple();
    }
    async create() {
        let info = this["request"].body;
        info.type = 'schema';
        if (!info.scope)
            info.scope = 'document';
        if (this["bucket"])
            info.bucket = this["bucket"].name;
        return this["clMongoObj"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const { id } = this["request"].query;
        let info = this["request"].body;
        const { scope } = info;
        info = lodash_1.default.omit(info, ['_id', 'scope', 'bucket']);
        const query = { _id: new ObjectId(id), type: 'schema' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        return this["clMongoObj"]
            .updateOne(query, { $set: info }, { upsert: true })
            .then(() => {
            info.scope = scope;
            return new tms_koa_1.ResultData(info);
        });
    }
    async remove() {
        const { id } = this["request"].query;
        if (!id)
            return new tms_koa_1.ResultFault('参数不完整');
        let rst = await this["clMongoObj"].findOne({
            schema_id: id,
            type: 'collection',
        });
        if (rst) {
            return new tms_koa_1.ResultFault('文档列定义正在被使用，不能删除');
        }
        const query = { _id: new ObjectId(id), type: 'schema' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        return this["clMongoObj"].deleteOne(query).then(() => new tms_koa_1.ResultData('ok'));
    }
}
exports.default = Schema;
