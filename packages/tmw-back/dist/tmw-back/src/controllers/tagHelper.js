"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helper_1 = require("./helper");
class TagHelper extends helper_1.default {
    async tagByName(name) {
        const query = { name, type: 'tag' };
        if (this.ctrl.bucket)
            query["bucket"] = this.ctrl.bucket.name;
        const tag = await this.clMongoObj.findOne(query);
        return tag;
    }
}
exports.default = TagHelper;
