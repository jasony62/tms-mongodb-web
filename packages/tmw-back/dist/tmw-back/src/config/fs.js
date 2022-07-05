"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let isCustomName = process.env.TMS_FINDER_FS_CUSTOMNAME === 'true' ? true : false;
exports.default = {
    local: {
        rootDir: process.env.TMS_FINDER_FS_ROOTDIR || 'storage',
        outDir: process.env.TMS_FINDER_FS_OUTDIR || 'storage',
        domains: {
            upload: { customName: isCustomName },
            download: { customName: isCustomName }
        },
        defaultDomain: 'upload'
    }
};
