"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    disabled: false,
    mongodb: {
        disabled: false,
        name: 'master',
        database: process.env.TMS_ACCOUNT_DBNAME || 'tms_account',
        collection: process.env.TMS_ACCOUNT_CLNAME || 'account',
        schema: { test: { type: 'string', title: '测试' } },
    },
    redis: {
        disabled: false,
        name: 'master',
    },
    authConfig: {
        pwdErrMaxNum: 5,
        authLockDUR: 20,
        pwdStrengthCheck: {
            min: 8,
            max: 20,
            pwdBlack: ['P@ssw0rd'],
            containProjects: {
                mustCheckNum: 3,
                contains: ['digits', 'uppercase', 'lowercase', 'symbols'],
            },
            hasSpaces: false,
            hasAccount: false,
            hasKeyBoardContinuousChar: false,
        },
    },
    captchaConfig: {},
};
