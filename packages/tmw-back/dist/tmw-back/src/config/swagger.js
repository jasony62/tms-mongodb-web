"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    definition: {
        info: {
            title: 'TMS MonogoDB Web 后端服务',
            version: '0.0.1',
        },
        servers: [
            {
                url: `${process.env.TMW_API_HOST || 'http://localhost'}:${process.env.TMW_API_PORT || 3000}`,
                description: '提供API服务的地址',
            },
        ],
    },
    apis: ['./oas/**/*.yaml', './controllers/**/*.js'],
};
