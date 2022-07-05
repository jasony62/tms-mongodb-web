"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const dayjs = require("dayjs");
class Base {
    mongoClient;
    bucket;
    client;
    config;
    constructor(mongoClient, bucket, client, config) {
        this.mongoClient = mongoClient;
        this.bucket = bucket;
        this.client = client;
        this.config = config;
    }
    assembleQuery(filter, like = true) {
        const fnKwRe = (keyword) => {
            let kws = keyword.split(/,|，/);
            return kws.length === 1 ? keyword : '(' + kws.join('|') + ')';
        };
        let query = {};
        let columns = Object.keys(filter);
        if (like === true) {
            for (let column of columns) {
                let cond = filter[column];
                let subQuery;
                if (typeof cond === 'object' && cond.keyword !== undefined) {
                    const { keyword, feature } = cond;
                    if (feature === 'start') {
                        subQuery = { $regex: `^${fnKwRe(keyword)}` };
                    }
                    else if (feature === 'notStart') {
                        subQuery = { $not: { $regex: `^${fnKwRe(keyword)}` } };
                    }
                    else if (feature === 'end') {
                        subQuery = { $regex: `^.*${fnKwRe(keyword)}$` };
                    }
                    else if (feature === 'notEnd') {
                        subQuery = { $not: { $regex: `^.*${fnKwRe(keyword)}$` } };
                    }
                    else if (feature === 'notLike') {
                        subQuery = { $not: { $regex: fnKwRe(keyword) } };
                    }
                    else if (feature === 'in') {
                        if (Array.isArray(keyword))
                            subQuery = { $in: keyword };
                    }
                    else if (feature === 'nin') {
                        if (Array.isArray(keyword))
                            subQuery = { $nin: keyword };
                    }
                    else if (feature === 'between') {
                        if (Array.isArray(keyword) && keyword.length === 2)
                            subQuery = { $gte: keyword[0], $lte: keyword[1] };
                    }
                    else if (feature === 'eq') {
                        subQuery = { $eq: keyword };
                    }
                    else if (feature === 'ne') {
                        subQuery = { $ne: keyword };
                    }
                    else if (feature === 'exists') {
                        if ([true, false].includes(keyword)) {
                            subQuery = { $exists: keyword };
                        }
                    }
                    else if (feature === 'all') {
                        if (Array.isArray(keyword))
                            subQuery = { $all: keyword };
                    }
                    else if (feature === 'elemMatch') {
                        if (Object.prototype.toString.call(keyword).toLowerCase() ===
                            '[object object]')
                            subQuery = { $elemMatch: keyword };
                    }
                    else if (feature === 'size') {
                        if (isNaN(keyword) === false) {
                            subQuery = { $size: +keyword };
                        }
                    }
                    else if (!feature && ![null, '', undefined].includes(keyword)) {
                        if (typeof keyword === 'string') {
                            subQuery = { $regex: fnKwRe(keyword) };
                        }
                        else if ([true, false].includes(keyword)) {
                            subQuery = keyword;
                        }
                        else if (isNaN(keyword) === false) {
                            subQuery = keyword;
                        }
                    }
                }
                else if (typeof cond === 'object' &&
                    cond.keyword !== undefined &&
                    !cond.keyword) {
                    subQuery = cond.keyword;
                }
                else if (typeof cond === 'string') {
                    subQuery = { $regex: cond };
                }
                else if (typeof cond === 'number') {
                    subQuery = cond;
                }
                if (subQuery !== undefined)
                    query[column] = subQuery;
            }
        }
        else {
            for (let column of columns) {
                query[column] = filter[column];
            }
        }
        return query;
    }
    toSkipAndLimit(page, size) {
        let skip = 0;
        let limit = 0;
        if (page && page > 0 && size && size > 0) {
            skip = (parseInt(page) - 1) * parseInt(size);
            limit = parseInt(size);
        }
        return { skip, limit };
    }
    beforeProcessByInAndUp(data, type) {
        let current = dayjs().format('YYYY-MM-DD HH:mm:ss');
        if (type === 'insert') {
            if (typeof data[this.config['TMS_APP_DEFAULT_UPDATETIME']] !== 'undefined')
                delete data[this.config['TMS_APP_DEFAULT_UPDATETIME']];
            data[this.config['TMS_APP_DEFAULT_CREATETIME']] = current;
        }
        else if (type === 'update') {
            if (typeof data[this.config['TMS_APP_DEFAULT_CREATETIME']] !== 'undefined')
                delete data[this.config['TMS_APP_DEFAULT_CREATETIME']];
            data[this.config['TMS_APP_DEFAULT_UPDATETIME']] = current;
        }
        return data;
    }
}
exports.Base = Base;
exports.default = Base;
