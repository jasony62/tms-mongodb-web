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
exports.Schema = void 0;
const mongodb = require("mongodb");
const base_1 = require("./base");
const ObjectId = mongodb.ObjectId;
class Schema extends base_1.Base {
    bySchemaId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.mongoClient();
            const cl = client.db('tms_admin').collection('mongodb_object');
            return cl
                .findOne({
                _id: new ObjectId(id),
                type: 'schema'
            })
                .then(schema => {
                if (!schema)
                    return false;
                return schema.body.properties;
            });
        });
    }
}
exports.Schema = Schema;
//# sourceMappingURL=schema.js.map