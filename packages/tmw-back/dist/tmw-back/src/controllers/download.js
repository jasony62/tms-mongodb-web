"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("tms-koa/lib/controller/fs");
class download extends fs_1.DownloadCtrl {
    constructor(...args) {
        super(...args);
    }
}
exports.default = download;
