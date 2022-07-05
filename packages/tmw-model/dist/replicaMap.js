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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicaMap = void 0;
const MONGODB_CLIENT = Symbol('mongodb_client');
class ReplicaMap {
    constructor(dbClient) {
        this[MONGODB_CLIENT] = dbClient;
    }
    get dbClient() {
        return this[MONGODB_CLIENT];
    }
    check(replicaMap) {
        if (!replicaMap || typeof replicaMap !== 'object')
            return [false, '集合复制关系为空或者类型不是对象'];
        let { primary, secondary } = replicaMap;
        if (!primary || typeof primary !== 'object')
            return [false, '[primary]为空或者类型不是对象'];
        if (!secondary || typeof secondary !== 'object')
            return [false, '[secondary]为空或者类型不是对象'];
        {
            let { db, cl } = primary;
            if (!db || typeof db !== 'string')
                return [false, '[primary.db]为空或者类型不是对象'];
            if (!cl || typeof cl !== 'string')
                return [false, '[primary.cl]为空或者类型不是对象'];
        }
        {
            let { db, cl } = secondary;
            if (!db || typeof db !== 'string')
                return [false, '[secondary.db]为空或者类型不是对象'];
            if (!cl || typeof cl !== 'string')
                return [false, '[secondary.db]为空或者类型不是对象'];
        }
        return [true];
    }
    synchronize(pri, sec, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            let dbClient = this.dbClient;
            const priSysCl = dbClient.db(pri.db).collection(pri.cl);
            const secSysCl = dbClient.db(sec.db).collection(sec.cl);
            let deletedCount;
            const syncAt = Date.now();
            const replacedCount = yield priSysCl.countDocuments();
            if (replacedCount) {
                limit = limit === undefined ? 10 : 100;
                let skip = 0;
                for (let remainder = replacedCount; remainder;) {
                    let docs = yield priSysCl.find({}, { skip, limit }).toArray();
                    for (let i = 0, l = docs.length; i < l; i++) {
                        let _a = docs[i], { _id } = _a, doc = __rest(_a, ["_id"]);
                        doc.__pri = {
                            db: pri.db,
                            cl: pri.cl,
                            id: _id,
                            time: syncAt
                        };
                        yield secSysCl.replaceOne({ '__pri.id': _id }, doc, { upsert: true });
                    }
                    remainder -= docs.length;
                    skip += docs.length;
                }
            }
            deletedCount = yield secSysCl
                .deleteMany({
                '__pri.db': pri.db,
                '__pri.cl': pri.cl,
                '__pri.time': { $not: { $eq: syncAt } }
            })
                .then(({ deletedCount }) => deletedCount);
            return { replacedCount, deletedCount };
        });
    }
}
exports.ReplicaMap = ReplicaMap;
//# sourceMappingURL=replicaMap.js.map