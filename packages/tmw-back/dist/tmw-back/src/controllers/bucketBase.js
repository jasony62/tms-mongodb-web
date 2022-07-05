"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
class BucketBase extends tms_koa_1.Ctrl {
    constructor(...args) {
        super(...args);
    }
    async tmsBeforeEach() {
        const client = this["mongoClient"];
        const cl = client.db('tms_admin').collection('bucket');
        this["clBucket"] = cl;
    }
}
exports.default = BucketBase;
