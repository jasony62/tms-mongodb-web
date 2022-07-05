"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const tms_koa_1 = require("tms-koa");
const tagBase_1 = require("../tagBase");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Tag extends tagBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async create() {
        let info = this["request"].body;
        info.name = info.name.replace(/(^\s*)|(\s*$)/g, '');
        info.type = 'tag';
        if (this["bucket"])
            info.bucket = this["bucket"].name;
        let existTag = await this["tagHelper"].tagByName(info.name);
        if (existTag)
            return new tms_koa_1.ResultFault('已存在同名标签');
        return this["clMongoObj"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const { id } = this["request"].query;
        let info = this["request"].body;
        let existTag = await this["tagHelper"].tagByName(info.name);
        if (existTag)
            return new tms_koa_1.ResultFault('已存在同名标签');
        let query = { _id: new ObjectId(id), type: 'tag' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        info = lodash_1.default.omit(info, ['_id', 'type', 'bucket']);
        return this["clMongoObj"]
            .updateOne(query, { $set: info }, { upsert: true })
            .then(() => {
            return new tms_koa_1.ResultData(info);
        });
    }
    async remove() {
        const { name } = this["request"].query;
        if (!name)
            return new tms_koa_1.ResultFault('参数不完整');
        let rst = await this["clMongoObj"].findOne({
            tags: { $elemMatch: { $eq: name } },
            type: 'schema',
        });
        if (rst) {
            return new tms_koa_1.ResultFault('标签正在被使用不能删除');
        }
        const query = { name: name, type: 'tag' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        return this["clMongoObj"].deleteOne(query).then(() => new tms_koa_1.ResultData('ok'));
    }
}
exports.default = Tag;
