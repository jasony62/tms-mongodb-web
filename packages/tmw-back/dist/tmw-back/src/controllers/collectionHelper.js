"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionHelper = void 0;
const collection_1 = require("../../../tmw-model/src/collection");
const helper_1 = require("./helper");
const nanoid_1 = require("nanoid");
class CollectionHelper extends helper_1.default {
    async rename(db, clName, newName) {
        const { name: dbName, sysname } = db;
        const client = this.ctrl.mongoClient;
        let equalNameSum = await this.clMongoObj
            .find({ name: newName, database: dbName, type: 'collection' })
            .count();
        if (equalNameSum !== 0)
            return [false, '集合名修改失败！已存在同名集合'];
        const query = { name: clName, database: dbName, type: 'collection' };
        if (this.bucket)
            query.bucket = this.bucket.name;
        let clDb = client.db(sysname).collection(clName);
        return clDb
            .rename(newName)
            .then(() => this.clMongoObj.updateOne(query, { $set: { name: newName } }))
            .then((rst) => [true, rst.result])
            .catch((err) => [false, err.message]);
    }
    async createCl(existDb, info) {
        let modelCl = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        modelCl.beforeProcessByInAndUp(info, 'insert');
        info.type = 'collection';
        info.database = existDb.name;
        info.db = { sysname: existDb.sysname, name: existDb.name };
        if (this.bucket)
            info.bucket = this.bucket.name;
        let [passed, nameOrCause] = modelCl.checkClName(info.name);
        if (passed === false)
            return [false, nameOrCause];
        info.name = nameOrCause;
        let existTmwCl = await modelCl.byName(existDb, info.name);
        if (existTmwCl)
            return [
                false,
                `数据库[name=${existDb.name}]中，已存在同名集合[name=${info.name}]`,
            ];
        let { usage } = info;
        if (usage !== undefined) {
            if (![0, 1].includes(parseInt(usage)))
                return [false, `指定了不支持的集合用途值[usage=${usage}]`];
            info.usage = parseInt(usage);
        }
        let existSysCl, sysname;
        for (let tries = 0; tries <= 2; tries++) {
            sysname = (0, nanoid_1.nanoid)(10);
            existSysCl = await modelCl.bySysname(existDb, sysname);
            if (!existSysCl)
                break;
        }
        if (existSysCl)
            return [false, '无法生成唯一的集合系统名称'];
        info.sysname = sysname;
        const client = this.ctrl.mongoClient;
        const mgdb = client.db(existDb.sysname);
        return mgdb
            .createCollection(info.sysname)
            .then(() => this.clMongoObj.insertOne(info))
            .then((result) => [true, result])
            .catch((err) => [false, err.message]);
    }
}
exports.CollectionHelper = CollectionHelper;
exports.default = CollectionHelper;
