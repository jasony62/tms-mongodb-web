"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const bucketBase_1 = require("@/controllers/bucketBase");
class Bucket extends bucketBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async list() {
        const tmsBuckets = await this["clBucket"]
            .find({
            $or: [{ creator: this["client"].id }, { 'coworkers.id': this["client"].id }],
        })
            .toArray();
        return new tms_koa_1.ResultData(tmsBuckets);
    }
}
exports.default = Bucket;
