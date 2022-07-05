"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
const mongodb = require("mongodb");
const base_1 = require("./base");
const ObjectId = mongodb.ObjectId;
class Schema extends base_1.Base {
    async bySchemaId(id) {
        const client = await this.mongoClient();
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
    }
}
exports.Schema = Schema;
exports.default = Schema;
