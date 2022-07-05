"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collection_1 = require("../../../../tmw-model/src/collection");
class Helper {
    constructor(ctrl) {
        this["ctrl"] = ctrl;
    }
    get clPreset() {
        const client = this["ctrl"].mongoClient;
        const cl = client.db('tms_admin').collection('bucket_preset_object');
        return cl;
    }
    async dbByName(name) {
        const query = { name, type: 'database' };
        const db = await this.clPreset.findOne(query);
        return db;
    }
    async colByName(dbName, name) {
        const query = { database: dbName, name, type: 'collection' };
        const db = await this.clPreset.findOne(query);
        return db;
    }
    async findRequestDb(bThrowNotFound = true) {
        const dbName = this["ctrl"].request.query.db;
        const query = { name: dbName, type: 'database' };
        const db = await this.clPreset.findOne(query);
        if (bThrowNotFound && !db)
            throw Error('指定的数据库不可访问');
        return db;
    }
    checkClName(clName) {
        let model = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        return model.checkClName(clName);
    }
}
exports.default = Helper;
