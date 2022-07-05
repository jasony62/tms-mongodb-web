"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const tms_koa_1 = require("tms-koa");
function allowAccessBucket(bucket, clientId) {
    if (bucket.creator === clientId)
        return true;
    const { coworkers } = bucket;
    if (!Array.isArray(coworkers))
        return false;
    return coworkers.some((c) => c.id === clientId);
}
class Base extends tms_koa_1.Ctrl {
    constructor(...args) {
        super(...args);
    }
    async tmsBeforeEach() {
        if (/yes|true/i.test(process.env.TMW_REQUIRE_BUCKET)) {
            const bucketName = this["request"].query.bucket;
            if (!bucketName) {
                return new tms_koa_1.ResultFault('没有提供bucket参数');
            }
            const client = this["mongoClient"];
            const clBucket = client.db('tms_admin').collection('bucket');
            const bucket = await clBucket.findOne({
                name: bucketName,
            });
            if (!bucket) {
                return new tms_koa_1.ResultObjectNotFound(`指定的[bucket=${bucketName}]不存在`);
            }
            if (!allowAccessBucket(bucket, this["client"].id)) {
                return new tms_koa_1.ResultObjectNotFound(`没有访问[bucket=${bucketName}]的权限`);
            }
            this["bucket"] = bucket;
        }
        return true;
    }
}
exports.Base = Base;
exports.default = Base;
