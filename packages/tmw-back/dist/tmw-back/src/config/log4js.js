"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    appenders: {
        consoleout: { type: 'console' },
        fileout: {
            type: 'file',
            filename: './logs/back-logs.log',
            maxLogSize: 1024 * 1024,
        },
    },
    categories: {
        default: {
            appenders: ['consoleout', 'fileout'],
            level: process.env.TMS_APP_LOG4JS_LEVEL || 'debug',
        },
    },
    pm2: true,
};
