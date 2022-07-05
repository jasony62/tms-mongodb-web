"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = void 0;
const base_1 = require("./base");
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$';
class Db extends base_1.Base {
    constructor(mongoClient, bucket, client, config) {
        super(mongoClient, bucket, client, config);
    }
    checkDbName(dbName) {
        if (new RegExp(DB_NAME_RE).test(dbName) !== true)
            return [
                false,
                '库名必须以英文字母开头，可用英文字母或_或数字组合，最长64位',
            ];
        return [true, dbName];
    }
    async byName(dbName) {
        const query = { name: dbName, type: 'database' };
        if (this.bucket)
            query.bucket = this.bucket.name;
        const clMongoObj = this.mongoClient
            .db('tms_admin')
            .collection('mongodb_object');
        const db = await clMongoObj.findOne(query);
        return db;
    }
}
exports.Db = Db;
exports.default = Db;
