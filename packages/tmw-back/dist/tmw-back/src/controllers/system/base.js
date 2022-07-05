"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const helper_1 = require("./helper");
class Base extends tms_koa_1.Ctrl {
    constructor(...args) {
        super(...args);
        this["helper"] = new helper_1.default(this);
    }
    async tmsBeforeEach() {
        this["clPreset"] = this["helper"].clPreset;
    }
}
exports.default = Base;
