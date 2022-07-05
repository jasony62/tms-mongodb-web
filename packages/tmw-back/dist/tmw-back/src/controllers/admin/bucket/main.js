"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const bucketBase_1 = require("@/controllers/bucketBase");
class Bucket extends bucketBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async tmsBeforeEach() {
        if (!this["client"])
            return new tms_koa_1.ResultFault('只有通过认证的用户才可以执行该操作');
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        return true;
    }
    async create() {
        let info = this["request"].body;
        const cl = this["clBucket"];
        let buckets = await cl.find({ name: info.name }).toArray();
        if (buckets.length > 0) {
            return new tms_koa_1.ResultFault('已存在同名存储空间');
        }
        info.creator = this["client"].id;
        return cl.insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const bucketName = this["request"].query.bucket;
        let info = this["request"].body;
        let { _id, name, ...updatedInfo } = info;
        const bucketInfo = await this["clBucket"].findOne({ name: bucketName });
        if (this["client"].id !== bucketInfo.creator)
            return new tms_koa_1.ResultFault('没有权限');
        return this["clBucket"]
            .updateOne({ name: bucketName }, { $set: updatedInfo })
            .then((res) => {
            return new tms_koa_1.ResultData(info);
        });
    }
    async remove() {
        const { bucket: bucketName } = this["request"].query;
        const bucketInfo = await this["clBucket"].findOne({ name: bucketName });
        if (this["client"].id !== bucketInfo.creator)
            return new tms_koa_1.ResultFault('没有权限');
        return this["clBucket"]
            .deleteOne({ name: bucketName, creator: this["client"].id })
            .then((result) => new tms_koa_1.ResultData(result.result));
    }
    async list() {
        const tmsBuckets = await this["clBucket"]
            .find({ $or: [{ creator: this["client"].id }, { 'coworkers.id': this["client"].id }] })
            .toArray();
        return new tms_koa_1.ResultData(tmsBuckets);
    }
}
exports.default = Bucket;
