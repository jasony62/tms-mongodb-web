"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Schema extends base_1.default {
    constructor(...args) {
        super(...args);
    }
    async create() {
        let info = this["request"].body;
        info.type = 'schema';
        if (!info.scope)
            return new tms_koa_1.ResultData('没有指定属性定义适用对象类型');
        return this["clPreset"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const { id } = this["request"].query;
        let info = this["request"].body;
        info = lodash_1.default.omit(info, ['_id', 'scope', 'type']);
        const query = { _id: new ObjectId(id), type: 'schema' };
        return this["clPreset"]
            .updateOne(query, { $set: info }, { upsert: true })
            .then(() => new tms_koa_1.ResultData(info));
    }
    async remove() {
        const { id } = this["request"].query;
        if (!id)
            return new tms_koa_1.ResultFault('参数不完整');
        let rst = await this["clPreset"].findOne({
            schema_id: id,
            type: 'collection',
        });
        if (rst)
            return new tms_koa_1.ResultFault('扩展字段定义正在被使用不能删除');
        const query = { _id: new ObjectId(id), type: 'schema' };
        return this["clPreset"].deleteOne(query).then(() => new tms_koa_1.ResultData('ok'));
    }
    async list() {
        const { scope } = this["request"].query;
        if (!/db|collection|document/.test(scope))
            return new tms_koa_1.ResultData('没有指定有效的属性定义适用对象类型');
        const query = { type: 'schema', scope };
        return this["clPreset"]
            .find(query, { projection: { type: 0, scope: 0 } })
            .toArray()
            .then((schemas) => new tms_koa_1.ResultData(schemas));
    }
    async listSimple() {
        const { scope } = this["request"].query;
        if (!/db|collection|document/.test(scope))
            return new tms_koa_1.ResultData('没有指定有效的属性定义适用对象类型');
        const query = { type: 'schema', scope };
        return this["clPreset"]
            .find(query, {
            projection: { _id: 1, title: 1, description: 1, scope: 1 },
        })
            .toArray()
            .then((schemas) => new tms_koa_1.ResultData(schemas));
    }
}
exports.default = Schema;
