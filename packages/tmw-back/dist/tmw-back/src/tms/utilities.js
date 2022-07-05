"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function unrepeatByArray(arr, columns, keepFirstRepeatData = false) {
    let hash = [];
    let repeatData = [];
    let newArr = lodash_1.default.filter(arr, (d) => {
        let dd = {};
        columns.forEach((v) => {
            dd[v] = d[v];
        });
        dd = JSON.stringify(dd);
        if (hash.includes(dd)) {
            repeatData.push(dd);
            return false;
        }
        else {
            hash.push(dd);
            return true;
        }
    });
    if (keepFirstRepeatData === false) {
        newArr = lodash_1.default.filter(newArr, (d) => {
            let dd = {};
            columns.forEach((v) => {
                dd[v] = d[v];
            });
            dd = JSON.stringify(dd);
            if (repeatData.includes(dd)) {
                return false;
            }
            else {
                return true;
            }
        });
    }
    return newArr;
}
exports.default = unrepeatByArray;
