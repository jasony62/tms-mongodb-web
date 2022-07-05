"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helper = void 0;
const tmw_model_1 = require("tmw-model");
class Helper {
    ctrl;
    bucket;
    constructor(ctrl) {
        this.ctrl = ctrl;
    }
    get clMongoObj() {
        const client = this.ctrl.mongoClient;
        const cl = client.db('tms_admin').collection('mongodb_object');
        return cl;
    }
    requestPage({ defaultSize = 10 } = {}) {
        let { page, size } = this.ctrl.request.query;
        if (!parseInt(page))
            return { skip: false };
        let limit = parseInt(size) ? parseInt(size) : parseInt(defaultSize);
        let skip = (page - 1) * limit;
        return { skip, limit };
    }
    async findRequestDb(bThrowNotFound = true, dbName = null) {
        if (!dbName)
            dbName = this.ctrl.request.query.db;
        const query = { name: dbName, type: 'database' };
        if (this.ctrl.bucket)
            query.bucket = this.ctrl.bucket.name;
        const db = await this.clMongoObj.findOne(query);
        if (bThrowNotFound && !db)
            throw Error(`指定的数据库[db=${dbName}]不可访问`);
        return db;
    }
    async findRequestCl(bThrowNotFound = true, dbName = null, clName = null) {
        if (!dbName || !clName) {
            dbName = this.ctrl.request.query.db;
            clName = this.ctrl.request.query.cl;
        }
        const modelCl = new tmw_model_1.Collection(this.ctrl.bucket);
        const cl = await modelCl.byName(dbName, clName);
        if (bThrowNotFound && !cl)
            throw Error(`指定的集合[db=${dbName}][cl=${clName}]不可访问`);
        return cl;
    }
    findSysColl(tmwCl) {
        let { mongoClient } = this.ctrl;
        let sysCl = mongoClient.db(tmwCl.db.sysname).collection(tmwCl.sysname);
        return sysCl;
    }
}
exports.Helper = Helper;
exports.default = Helper;
