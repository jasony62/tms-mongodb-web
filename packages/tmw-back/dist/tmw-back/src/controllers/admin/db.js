"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbBase_1 = require("../dbBase");
const tms_koa_1 = require("tms-koa");
const db_1 = require("../../../../tmw-model/src/db");
class Db extends dbBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async list() {
        return super.list();
    }
    async uncontrolled() {
        const result = await this["mongoClient"]
            .db()
            .admin()
            .listDatabases({ nameOnly: true });
        let dbs = result.databases;
        dbs = dbs.filter(({ name }) => !['admin', 'local', 'config', 'tms_admin'].includes(name));
        let uncontrolled = [];
        for (let i = 0, db; i < dbs.length; i++) {
            db = dbs[i];
            let tmwDb = await this["clMongoObj"].findOne({
                sysname: db.name,
                type: 'database',
            });
            if (!tmwDb)
                uncontrolled.push({ sysname: db.name });
        }
        return new tms_koa_1.ResultData(uncontrolled);
    }
    async create() {
        return super.create();
    }
    async add() {
        const { sysname } = this["request"].query;
        const existDb = await this["dbHelper"].dbBySysname(sysname);
        if (existDb)
            return new tms_koa_1.ResultFault(`数据库[${sysname}]已经作为管理对象`);
        let info = this["request"].body;
        info.type = 'database';
        info.sysname = sysname;
        if (this["bucket"])
            info.bucket = this["bucket"].name;
        let modelDb = new db_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        let newName = modelDb.checkDbName(info.name);
        if (newName[0] === false)
            return new tms_koa_1.ResultFault(newName[1]);
        info.name = newName[1];
        let existTmwDb = await this["dbHelper"].dbByName(info.name);
        if (existTmwDb)
            return new tms_koa_1.ResultFault(`已存在同名数据库[name=${info.name}]`);
        return this["clMongoObj"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        return super.update();
    }
    async remove() {
        const existDb = await this["dbHelper"].findRequestDb();
        if (['admin', 'config', 'local', 'tms_admin'].includes(existDb.sysname))
            return new tms_koa_1.ResultFault(`不能删除系统自带数据库[${existDb.sysname}]`);
        const cl = this["clMongoObj"];
        const query = { database: existDb.name, type: 'collection' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        let colls = await cl.find(query).toArray();
        if (colls.length > 0)
            return new tms_koa_1.ResultFault(`删除失败，数据库[${existDb.sysname}]中存在未删除的集合`);
        const client = this["mongoClient"];
        return cl
            .deleteOne({ _id: existDb._id })
            .then(() => client.db(existDb.sysname).dropDatabase())
            .then(() => new tms_koa_1.ResultData('ok'));
    }
    async discard() {
        const existDb = await this["dbHelper"].findRequestDb();
        if (['admin', 'config', 'local', 'tms_admin'].includes(existDb.sysname))
            return new tms_koa_1.ResultFault(`不能删除系统自带数据库[${existDb.sysname}]`);
        const cl = this["clMongoObj"];
        const query = { database: existDb.name, type: 'collection' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        let colls = await cl.find(query).toArray();
        if (colls.length > 0)
            return new tms_koa_1.ResultFault(`删除失败，数据库[${existDb.sysname}]中存在未删除的集合`);
        return cl.deleteOne({ _id: existDb._id }).then(() => new tms_koa_1.ResultData('ok'));
    }
    async top() {
        return super.top();
    }
}
exports.default = Db;
