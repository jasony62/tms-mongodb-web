"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = require("../config/log4js");
const log4js = require("log4js");
log4js.configure(log4js_1.default);
const logger = log4js.getLogger('tmw-replica-watch');
const tms_koa_1 = require("tms-koa");
const mongodb_1 = require("tms-koa/lib/context/mongodb");
const { MongodbContext } = mongodb_1.default;
const ChangeStreamByReplicaId = new Map();
function getMongoClient() {
    const config = (0, tms_koa_1.loadConfig)('mongodb');
    return MongodbContext.init(config).then(() => MongodbContext.mongoClient());
}
async function newReplicaWatcher(mongoClient, pri, sec) {
    const priCl = mongoClient.db(pri.db).collection(pri.cl);
    const secCl = mongoClient.db(sec.db).collection(sec.cl);
    const priCs = priCl.watch([], { fullDocument: 'updateLookup' });
    logger.debug(`开始监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`);
    priCs.on('change', csEvent => {
        const { operationType, ns } = csEvent;
        if (operationType === 'insert') {
            let { _id, ...doc } = csEvent.fullDocument;
            doc.__pri = { db: ns.db, cl: ns.coll, id: _id, time: Date.now() };
            secCl.insertOne(doc);
        }
        else if (operationType === 'update' || operationType === 'replace') {
            if (csEvent.fullDocument) {
                let { _id, ...doc } = csEvent.fullDocument;
                doc.__pri = { db: ns.db, cl: ns.coll, id: _id, time: Date.now() };
                secCl.replaceOne({ '__pri.id': _id }, doc);
            }
        }
        else if (operationType === 'delete') {
            let { _id } = csEvent.documentKey;
            secCl.deleteOne({ '__pri.id': _id });
        }
        else if (operationType === 'invalidate') {
            logger.debug('invalidate', csEvent);
        }
    });
    priCs.on('close', () => {
        logger.debug(`关闭监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`);
    });
    priCs.on('end', () => {
        logger.debug(`结束监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`);
    });
    return priCs;
}
let ReplicaMapWatcher;
async function watchReplicaMap(mongoClient) {
    logger.info('开始监听[replica_map]');
    const cl = mongoClient.db('tms_admin').collection('replica_map');
    ReplicaMapWatcher = cl.watch([], { fullDocument: 'updateLookup' });
    ReplicaMapWatcher.on('change', async (csEvent) => {
        const { operationType } = csEvent;
        let strId = csEvent.documentKey._id.toHexString();
        if (operationType === 'insert') {
            let { primary, secondary } = csEvent.fullDocument;
            newReplicaWatcher(mongoClient, primary, secondary).then(watcher => {
                ChangeStreamByReplicaId.set(strId, watcher);
            });
        }
        else if (operationType === 'update' || operationType === 'replace') {
        }
        else if (operationType === 'delete') {
            let watcher = ChangeStreamByReplicaId.get(strId);
            if (watcher) {
                ChangeStreamByReplicaId.delete(strId);
                watcher.close();
            }
        }
        else if (operationType === 'invalidate') {
        }
    });
    ReplicaMapWatcher.on('close', () => {
        logger.info('关闭监听[replica_map]');
    });
    ReplicaMapWatcher.on('end', () => {
        logger.info('结束监听[replica_map]');
    });
    return true;
}
async function startReplicaMap(mongoClient) {
    const cl = mongoClient.db('tms_admin').collection('replica_map');
    const replicas = await cl.find().toArray();
    replicas.forEach(replica => {
        let strId = replica._id.toHexString();
        if (!ChangeStreamByReplicaId.has(strId)) {
            newReplicaWatcher(mongoClient, replica.primary, replica.secondary).then(watcher => {
                ChangeStreamByReplicaId.set(strId, watcher);
            });
        }
    });
    return true;
}
function startup() {
    getMongoClient().then(mongoClient => {
        watchReplicaMap(mongoClient).then(() => {
            startReplicaMap(mongoClient);
        });
    });
}
function cleanWatchers() {
    if (ReplicaMapWatcher) {
        ReplicaMapWatcher.close();
        ReplicaMapWatcher = null;
    }
    if (ChangeStreamByReplicaId.size) {
        ChangeStreamByReplicaId.forEach(watcher => watcher.close());
        ChangeStreamByReplicaId.clear();
    }
}
process.on('SIGINT', () => {
    cleanWatchers();
    setTimeout(() => {
        process.exit();
    });
});
process.on('exit', () => {
    cleanWatchers();
    logger.info('退出集合复制监听');
});
startup();
