"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("tms-koa-account/models/crypto");
exports.default = {
    disabled: false,
    mongodb: {
        disabled: false,
        name: 'master',
        database: 'tms_account',
        collection: 'account',
        schema: { "test": { type: 'string', title: '测试' } },
    },
    redis: {
        disabled: false,
        name: 'master'
    },
    accountBeforeEach: (ctx) => {
        const rst = (0, crypto_1.decodeAccountV1)(ctx);
        if (rst[0] === false)
            return Promise.reject(rst[1]);
        return Promise.resolve({ username: rst[1].username, password: rst[1].password });
    },
    authConfig: {
        pwdErrMaxNum: 5,
        authLockDUR: 20,
        pwdStrengthCheck: {
            min: 8,
            max: 20,
            pwdBlack: ["P@ssw0rd"],
            containProjects: { mustCheckNum: 3, contains: ["digits", "uppercase", "lowercase", "symbols"] },
            hasSpaces: false,
            hasAccount: false,
            hasKeyBoardContinuousChar: false,
        }
    },
    captchaConfig: {}
};
