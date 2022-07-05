"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let appConfig = {
    master: {
        host: process.env.TMS_MONGODB_HOST || 'localhost',
        port: parseInt(process.env.TMS_MONGODB_PORT) || 27017,
        user: process.env.TMS_MONGODB_USER || false,
        password: process.env.TMS_MONGODB_PASSWORD || false,
    },
};
if (/yes|true/i.test(process.env.TMW_REALTIME_REPLICA)) {
    appConfig.master.host = [
        process.env.TMS_MONGODB_HOST || 'localhost',
        process.env.TMS_MONGODB_S_HOST || 'localhost',
        process.env.TMS_MONGODB_A_HOST || 'localhost',
    ];
    appConfig.master.port = [
        parseInt(process.env.TMS_MONGODB_PORT) || 27017,
        parseInt(process.env.TMW_MONGODB_S_PORT) || 27018,
        parseInt(process.env.TMW_MONGODB_A_PORT) || 27019,
    ];
    appConfig.master.replicaSet = process.env.TMW_REPLICA_SET_NAME || 'tmw-rs';
}
exports.default = appConfig;
