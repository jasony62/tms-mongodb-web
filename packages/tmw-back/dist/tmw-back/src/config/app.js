"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let appConfig = {
    name: process.env.TMS_APP_NAME || 'tms-mongodb-web',
    port: process.env.TMS_APP_PORT || 3000,
    router: {
        auth: {
            prefix: process.env.TMS_APP_ROUTER_AUTH || 'auth',
        },
        controllers: {
            prefix: process.env.TMS_APP_ROUTER_CONTROLLER || 'api',
            plugins_npm: [{ id: 'tms-koa-account', alias: 'account' }],
        },
        plugins: {
            prefix: process.env.TMS_APP_ROUTER_PLUGIN || 'plugin',
        },
        fsdomain: {
            prefix: process.env.TMS_APP_ROUTER_FSDOMAIN || 'fs',
        },
    },
    tmsTransaction: false,
    auth: {
        jwt: {
            privateKey: 'tms-mongodb-web',
            expiresIn: 3600,
        },
        captcha: {
            npm: {
                disabled: false,
                id: 'tms-koa-account',
                module: 'models/captcha',
                checker: 'checkCaptcha',
                generator: 'createCaptcha',
            },
        },
    },
    tmwConfig: {
        TMS_APP_DEFAULT_CREATETIME: process.env.TMS_APP_DEFAULT_CREATETIME || 'TMS_DEFAULT_CREATE_TIME',
        TMS_APP_DEFAULT_UPDATETIME: process.env.TMS_APP_DEFAULT_UPDATETIME || 'TMS_DEFAULT_UPDATE_TIME',
        TMS_APP_DATA_ACTION_LOG: process.env.TMS_APP_DATA_ACTION_LOG || 'N',
    },
};
exports.default = appConfig;
