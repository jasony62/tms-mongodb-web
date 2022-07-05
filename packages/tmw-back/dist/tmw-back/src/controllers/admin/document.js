"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const documentBase_1 = require("../documentBase");
class Document extends documentBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async list() {
        return super.list();
    }
    async group() {
        return super.group();
    }
    async create() {
        return super.create();
    }
    async update() {
        return super.update();
    }
    async updateMany() {
        return super.updateMany();
    }
    async remove() {
        return super.remove();
    }
    async removeMany() {
        return super.removeMany();
    }
    async copyMany() {
        return super.copyMany();
    }
    async getGroupByColumnVal() {
        return super.getGroupByColumnVal();
    }
    async getDocCompleteStatusById() {
        return super.getDocCompleteStatusById();
    }
}
exports.default = Document;
