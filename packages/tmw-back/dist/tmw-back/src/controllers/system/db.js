"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const db_1 = require("../../../../tmw-model/src/db");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Db extends base_1.default {
    constructor(...args) {
        super(...args);
    }
    async create() {
        let info = this["request"].body;
        info.type = 'database';
        let model = new db_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let newName = model.checkDbName(info.name);
        if (newName[0] === false)
            return new tms_koa_1.ResultFault(newName[1]);
        info.name = newName[1];
        let existDb = await this["helper"].dbByName(info.name);
        if (existDb)
            return new tms_koa_1.ResultFault('已存在同名预制数据库');
        return this["clPreset"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const beforeDb = await this["helper"].findRequestDb();
        let info = this["request"].body;
        let { _id, ...updatedInfo } = info;
        let existDb = await this["helper"].dbByName(info.name);
        if (existDb)
            return new tms_koa_1.ResultFault('已存在同名预制数据库');
        const query = { _id: new ObjectId(beforeDb._id) };
        return this["clPreset"]
            .updateOne(query, { $set: updatedInfo })
            .then(() => new tms_koa_1.ResultData(info));
    }
    async remove() {
        const existDb = await this["helper"].findRequestDb();
        const cl = this["clPreset"];
        const query = { database: existDb.name, type: 'collection' };
        let colls = await cl.find(query).toArray();
        if (colls.length > 0)
            return new tms_koa_1.ResultFault('删除失败，此库中存在未删除的集合');
        return cl
            .deleteOne({ _id: new ObjectId(existDb._id) })
            .then(() => new tms_koa_1.ResultData('ok'));
    }
    async list() {
        const query = { type: 'database' };
        const tmsDbs = await this["clPreset"]
            .find(query, { projection: { _id: 0, type: 0 } })
            .toArray();
        return new tms_koa_1.ResultData(tmsDbs);
    }
}
exports.default = Db;
