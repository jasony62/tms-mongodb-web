"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collectionBase_1 = require("../collectionBase");
const tms_koa_1 = require("tms-koa");
const collection_1 = require("../../../../tmw-model/src/collection");
class Collection extends collectionBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async byName() {
        return super.byName();
    }
    async list() {
        return super.list();
    }
    async uncontrolled() {
        const client = this["mongoClient"];
        const rawCls = await client
            .db(this["reqDb"].sysname)
            .listCollections({}, { nameOnly: true })
            .toArray();
        let uncontrolled = [];
        for (let i = 0, rawCl; i < rawCls.length; i++) {
            rawCl = rawCls[i];
            let tmwCl = await this["clMongoObj"].findOne({
                sysname: rawCl.name,
                type: 'collection',
            });
            if (!tmwCl)
                uncontrolled.push({ sysname: rawCl.name });
        }
        return new tms_koa_1.ResultData(uncontrolled);
    }
    async create() {
        return super.create();
    }
    async add() {
        const modelCl = new collection_1.default(this["mongoClient"], this["bucket"], this["client"], this["config"]);
        const { sysname } = this["request"].query;
        const existSysCl = await modelCl.bySysname(this["reqDb"], sysname);
        if (existSysCl)
            return new tms_koa_1.ResultFault(`集合[sysname=${sysname}]已经是管理对象`);
        const info = this["request"].body;
        let [passed, cause] = modelCl.checkClName(info.name);
        if (passed === false)
            return new tms_koa_1.ResultFault(cause);
        let existTmwCl = await modelCl.byName(this["reqDb"], info.name);
        if (existTmwCl)
            return new tms_koa_1.ResultFault(`数据库[name=${this["reqDb"].name}]中，已存在同名集合[name=${info.name}]`);
        info.type = 'collection';
        info.sysname = sysname;
        info.database = this["reqDb"].name;
        info.db = { sysname: this["reqDb"].sysname, name: this["reqDb"].name };
        if (this["bucket"])
            info.bucket = this["bucket"].name;
        let { usage } = info;
        if (usage !== undefined) {
            if (![0, 1].includes(parseInt(usage)))
                return new tms_koa_1.ResultFault(`指定了不支持的集合用途值[usage=${usage}]`);
            info.usage = parseInt(usage);
        }
        return this["clMongoObj"].insertOne(info).then((result) => {
            info._id = result.insertedId;
            return new tms_koa_1.ResultData(info);
        });
    }
    async update() {
        return super.update();
    }
    async remove() {
        return super.remove();
    }
    async discard() {
        const existCl = await this["clHelper"].findRequestCl();
        return this["clMongoObj"]
            .deleteOne({ _id: existCl._id })
            .then(() => new tms_koa_1.ResultData('ok'));
    }
}
exports.default = Collection;
