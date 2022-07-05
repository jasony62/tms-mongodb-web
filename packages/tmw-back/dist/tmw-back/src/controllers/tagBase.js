"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("./base");
const tagHelper_1 = require("./tagHelper");
class TagBase extends base_1.default {
    constructor(...args) {
        super(...args);
        this["tagHelper"] = new tagHelper_1.default(this);
    }
    async tmsBeforeEach() {
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        this["clMongoObj"] = this["tagHelper"].clMongoObj;
        return true;
    }
    async list() {
        const query = { type: 'tag' };
        if (this["bucket"])
            query["bucket"] = this["bucket"].name;
        const tmsTags = await this["clMongoObj"].find(query).toArray();
        return new tms_koa_1.ResultData(tmsTags);
    }
}
exports.default = TagBase;
