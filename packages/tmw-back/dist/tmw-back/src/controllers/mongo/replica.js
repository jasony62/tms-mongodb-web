"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const replicaBase_1 = require("../replicaBase");
class Replica extends replicaBase_1.default {
    constructor(...args) {
        super(...args);
    }
    async list() {
        return super.list();
    }
    async create() {
        return super.create();
    }
    async remove() {
        return super.remove();
    }
    async synchronize() {
        return super.synchronize();
    }
    async synchronizeAll() {
        return super.synchronizeAll();
    }
}
exports.default = Replica;
