"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = require("./config/log4js");
const log4js = require("log4js");
log4js.configure(log4js_1.default);
const logger = log4js.getLogger('tms-mongodb-web');
const mongodb_1 = require("tms-koa/lib/context/mongodb");
const { PluginContext } = mongodb_1.default;
const tms_koa_1 = require("tms-koa");
const tmsKoa = new tms_koa_1.TmsKoa();
function loadPlugins() {
    let config = (0, tms_koa_1.loadConfig)('plugin');
    PluginContext.init(config);
}
let Replica_Child_Process;
function afterInit(context) {
    logger.info('已完成框架初始化');
    loadPlugins();
    if (/yes|true/i.test(process.env.TMW_REALTIME_REPLICA)) {
        logger.info('启动集合实时复制线程');
        const cp = require('child_process');
        Replica_Child_Process = cp.spawn('node', ['./replica/watch.js'], {
            detached: true,
            stdio: 'ignore',
        });
        Replica_Child_Process.unref();
    }
}
process.on('SIGINT', () => {
    process.exit();
});
process.on('exit', () => {
    if (Replica_Child_Process) {
        Replica_Child_Process.kill('SIGINT');
    }
    logger.info('退出');
});
tmsKoa.startup({ afterInit });
