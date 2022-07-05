"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const schemaHelper_1 = require("./schemaHelper");
class SchemaBase extends base_1.default {
    constructor(...args) {
        super(...args);
        this["schemaHelper"] = new schemaHelper_1.default(this);
    }
    async tmsBeforeEach() {
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        this["clMongoObj"] = this["schemaHelper"].clMongoObj;
        return true;
    }
    async list() {
        let { scope } = this["request"].query;
        let find = { type: 'schema' };
        if (scope) {
            find["scope"] = { $in: scope.split(',') };
        }
        else {
            find["scope"] = 'document';
        }
        if (this["bucket"])
            find["bucket"] = this["bucket"].name;
        return this["clMongoObj"]
            .find(find)
            .toArray()
            .then((schemas) => new tms_koa_1.ResultData(schemas));
    }
    async listSimple() {
        let { scope } = this["request"].query;
        let query = { type: 'schema' };
        if (scope) {
            query["scope"] = { $in: scope.split(',') };
        }
        else {
            query["scope"] = 'document';
        }
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        return this["clMongoObj"]
            .find(query, {
            projection: { _id: 1, title: 1, description: 1, scope: 1 },
        })
            .toArray()
            .then((schemas) => new tms_koa_1.ResultData(schemas));
    }
    async listByTag() {
        let { tag } = this["request"].query;
        let find = { type: 'schema', tags: { $elemMatch: { $eq: tag } } };
        if (this["bucket"])
            find["bucket"] = this["bucket"].name;
        return this["clMongoObj"]
            .find(find)
            .toArray()
            .then((schemas) => new tms_koa_1.ResultData(schemas));
    }
}
exports.default = SchemaBase;
