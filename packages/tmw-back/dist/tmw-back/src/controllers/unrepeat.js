"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const helper_1 = require("./helper");
const utilities_1 = require("../tms/utilities");
async function unrepeat(ctrl, data, transform) {
    let { columns, db: dbName, cl: clName, insert } = transform.config;
    if (!columns || !dbName || !clName) {
        return Promise.resolve([]);
    }
    const helper = new helper_1.default(ctrl);
    const existCl = await helper.findRequestCl(true, dbName, clName);
    const cl = helper.findSysColl(existCl);
    let docs = (0, utilities_1.default)(data, columns);
    let docs2 = await docs.map(async (doc) => {
        let find = {};
        columns.forEach(v => {
            find[v] = doc[v];
        });
        let num = await cl.find(find).count();
        if (num > 0) {
            return false;
        }
        else {
            if (insert) {
                let newDoc = JSON.parse(JSON.stringify(doc));
                delete newDoc._id;
                let rst2 = await cl
                    .insertOne(newDoc)
                    .then(rst => doc)
                    .catch(err => false);
                return rst2;
            }
            else {
                return doc;
            }
        }
    });
    return Promise.all(docs2).then(docs3 => {
        return lodash_1.default.filter(docs3, d => {
            if (d == false) {
                return false;
            }
            else {
                return true;
            }
        });
    });
}
exports.default = unrepeat;
