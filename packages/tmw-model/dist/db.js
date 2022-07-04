"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Db = void 0;
const base_1 = require("./base");
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$';
class Db extends base_1.Base {
    checkDbName(dbName) {
        if (new RegExp(DB_NAME_RE).test(dbName) !== true)
            return [
                false,
                '库名必须以英文字母开头，可用英文字母或_或数字组合，最长64位',
            ];
        return [true, dbName];
    }
    byName(dbName) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { name: dbName, type: 'database' };
            if (this.bucket)
                query.bucket = this.bucket.name;
            const clMongoObj = this.mongoClient
                .db('tms_admin')
                .collection('mongodb_object');
            const db = yield clMongoObj.findOne(query);
            return db;
        });
    }
}
exports.Db = Db;
//# sourceMappingURL=db.js.map