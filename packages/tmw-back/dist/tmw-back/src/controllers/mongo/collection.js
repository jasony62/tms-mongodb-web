"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const collectionBase_1 = require("../collectionBase");
class Collection extends collectionBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async remove() {
        return new tms_koa_1.ResultData('删除指定数据库下的集合');
    }
}
exports.default = Collection;
