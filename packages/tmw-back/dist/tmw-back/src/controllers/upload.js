"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("tms-koa/lib/controller/fs");
class Upload extends fs_1.UploadCtrl {
    constructor(...args) {
        super(...args);
    }
}
exports.default = Upload;
