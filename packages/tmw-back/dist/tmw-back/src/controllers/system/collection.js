"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Collection extends base_1.default {
    constructor(...args) {
        super(...args);
    }
    async create() {
        const existDb = await this["helper"].findRequestDb();
        const info = this["request"].body;
        let newName = this["helper"].checkClName(info.name);
        if (newName[0] === false)
            return new tms_koa_1.ResultFault(newName[1]);
        info.name = newName[1];
        let existCol = await this["helper"].colByName(existDb.name, info.name);
        if (existCol)
            return new tms_koa_1.ResultFault('指定数据库中已存在同名预制集合');
        info.type = 'collection';
        info.database = existDb.name;
        return this["clPreset"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        const existDb = await this["helper"].findRequestDb();
        let { cl: clName } = this["request"].query;
        let info = this["request"].body;
        let newClName = this["helper"].checkClName(info.name);
        if (newClName[0] === false)
            return new tms_koa_1.ResultFault(newClName[1]);
        newClName = newClName[1];
        if (newClName !== clName) {
            let existCol = await this["helper"].colByName(existDb.name, info.name);
            if (existCol)
                return new tms_koa_1.ResultData('已存在同名集合，不允许修改集合名称');
            else
                info.name = newClName;
        }
        else {
            delete info.name;
        }
        const query = { database: existDb.name, name: clName, type: 'collection' };
        const { _id, database, type, ...updatedInfo } = info;
        const rst = await this["clPreset"]
            .updateOne(query, { $set: updatedInfo }, { upsert: true })
            .then((rst) => [true, rst.result])
            .catch((err) => [false, err.message]);
        if (rst[0] === false)
            return new tms_koa_1.ResultFault(rst[1]);
        return new tms_koa_1.ResultData(info);
    }
    async remove() {
        const existDb = await this["helper"].findRequestDb();
        let { cl: clName } = this["request"].query;
        const query = { database: existDb.name, name: clName, type: 'collection' };
        return this["clPreset"].deleteOne(query).then(() => new tms_koa_1.ResultData('ok'));
    }
    async byName() {
        const existDb = await this["helper"].findRequestDb();
        const { cl: clName } = this["request"].query;
        const query = { database: existDb.name, name: clName, type: 'collection' };
        return this["clPreset"]
            .findOne(query, { projection: { _id: 0, type: 0 } })
            .then((myCl) => {
            if (myCl && myCl.schema_id) {
                return this["clPreset"]
                    .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
                    .then((schema) => {
                    myCl.schema = schema;
                    delete myCl.schema_id;
                    return myCl;
                });
            }
            return myCl;
        })
            .then((myCl) => myCl ? new tms_koa_1.ResultData(myCl) : new tms_koa_1.ResultObjectNotFound());
    }
    async list() {
        const existDb = await this["helper"].findRequestDb();
        const query = { type: 'collection', database: existDb.name };
        const tmsCls = await this["clPreset"]
            .find(query, { projection: { _id: 0, type: 0, database: 0 } })
            .toArray();
        return new tms_koa_1.ResultData(tmsCls);
    }
}
exports.default = Collection;
