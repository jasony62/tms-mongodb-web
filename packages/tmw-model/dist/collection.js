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
exports.Collection = void 0;
const mongodb = require("mongodb");
const base_1 = require("./base");
const mongo_escape_1 = require("mongo-escape");
const ObjectId = mongodb.ObjectId;
class Collection extends base_1.Base {
    constructor(mongoClient, bucket, client, config) {
        super(mongoClient, bucket, client, config);
    }
    getSchemaByCollection(tmwCl) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.mongoClient();
            const cl = client.db('tms_admin').collection('mongodb_object');
            return cl
                .findOne({
                'db.sysname': tmwCl.db.sysname,
                name: tmwCl.name,
                type: 'collection',
            })
                .then((myCl) => {
                if (!myCl) {
                    return false;
                }
                if (myCl.schema_id) {
                    return cl
                        .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
                        .then((schema) => {
                        if (!schema) {
                            return false;
                        }
                        return schema.body.properties;
                    });
                }
                return false;
            });
        });
    }
    static getCollection(existDb, clName) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseObj = new base_1.Base('', '', '', '');
            const client = yield baseObj.mongoClient();
            const cl = client.db('tms_admin').collection('mongodb_object');
            return cl
                .findOne({
                'db.sysname': existDb.sysname,
                name: clName,
                type: 'collection',
            })
                .then((result) => result)
                .then((myCl) => {
                if (myCl.schema_id) {
                    return cl
                        .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
                        .then((schema) => {
                        myCl.schema = schema;
                        delete myCl.schema_id;
                        return myCl;
                    });
                }
                delete myCl.schema_id;
                return myCl;
            });
        });
    }
    checkClName(clName) {
        if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(clName) !== true)
            return [
                false,
                '集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位',
            ];
        let keyWord = [];
        if (keyWord.includes(clName))
            return [false, '不能以此名作为集合名，请更换为其它名称'];
        return [true, clName];
    }
    byName(db, clName) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { name: clName, type: 'collection' };
            if (typeof db === 'object')
                query['db.sysname'] = db.sysname;
            else if (typeof db === 'string')
                query['db.name'] = db;
            if (this.bucket)
                query.bucket = this.bucket.name;
            const client = yield this.mongoClient();
            const clMongoObj = client.db('tms_admin').collection('mongodb_object');
            const cl = yield clMongoObj.findOne(query);
            return cl;
        });
    }
    bySysname(db, clSysname) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = {
                'db.sysname': db.sysname,
                sysname: clSysname,
                type: 'collection',
            };
            if (this.bucket)
                query.bucket = this.bucket.name;
            const client = yield this.mongoClient();
            const clMongoObj = client.db('tms_admin').collection('mongodb_object');
            const cl = yield clMongoObj.findOne(query);
            return cl;
        });
    }
    checkRemoveConstraint(tmwCl, query, sysCl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tmwCl.custom && tmwCl.custom.docRemoveConstraint) {
                let { docRemoveConstraint } = tmwCl.custom;
                if (typeof docRemoveConstraint === 'object') {
                    docRemoveConstraint = (0, mongo_escape_1.default)(docRemoveConstraint);
                    let count1 = yield sysCl.countDocuments(query);
                    let count2 = yield sysCl.countDocuments(Object.assign({}, query, docRemoveConstraint));
                    if (count1 !== count2)
                        throw Error('要删除的文档不符合在集合上指定删除限制规则');
                }
            }
            return true;
        });
    }
}
exports.Collection = Collection;
//# sourceMappingURL=collection.js.map