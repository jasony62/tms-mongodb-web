"use strict";
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
    async synchronize(pri, sec, limits) {
        let dbClient = this.dbClient;
        const priSysCl = dbClient.db(pri.db).collection(pri.cl);
        const secSysCl = dbClient.db(sec.db).collection(sec.cl);
        let deletedCount;
        const syncAt = Date.now();
        const replacedCount = await priSysCl.countDocuments();
        if (replacedCount) {
            let { limit } = limits;
            limit = limit === undefined ? 10 : parseInt(limit);
            let skip = 0;
            for (let remainder = replacedCount; remainder;) {
                let docs = await priSysCl.find({}, { skip, limit }).toArray();
                for (let i = 0, l = docs.length; i < l; i++) {
                    let { _id, ...doc } = docs[i];
                    doc.__pri = {
                        db: pri.db,
                        cl: pri.cl,
                        id: _id,
                        time: syncAt
                    };
                    await secSysCl.replaceOne({ '__pri.id': _id }, doc, { upsert: true });
                }
                remainder -= docs.length;
                skip += docs.length;
            }
        }
        deletedCount = await secSysCl
            .deleteMany({
            '__pri.db': pri.db,
            '__pri.cl': pri.cl,
            '__pri.time': { $not: { $eq: syncAt } }
        })
            .then(({ deletedCount }) => deletedCount);
        return { replacedCount, deletedCount };
    }
}
exports.ReplicaMap = ReplicaMap;
exports.default = ReplicaMap;
