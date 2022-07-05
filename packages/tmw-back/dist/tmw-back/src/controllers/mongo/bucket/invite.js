"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Invite extends tms_koa_1.Ctrl {
    constructor(...args) {
        super(...args);
    }
    async accept() {
        const { bucket } = this["request"].query;
        if (!bucket)
            return new tms_koa_1.ResultFault('没有指定邀请的空间');
        const clLog = this["mongoClient"]
            .db('tms_admin')
            .collection('bucket_invite_log');
        const { code, nickname } = this["request"].body;
        if (!code || !nickname)
            return new tms_koa_1.ResultFault('没有提供又有效参数');
        const invite = await clLog.findOne({
            bucket,
            code,
            nickname,
            expireAt: { $gt: new Date() },
        });
        if (!invite)
            return new tms_koa_1.ResultFault('没有匹配的邀请，请确认邀请码、昵称是否正确，要求是否已过期');
        if (invite.acceptAt)
            return new tms_koa_1.ResultFault('邀请码已经使用，不允许重复使用');
        const invitee = this["client"].id;
        const clBucket = this["mongoClient"].db('tms_admin').collection('bucket');
        const coworkerQuery = {
            name: bucket,
            'coworkers.id': invitee,
        };
        const coworkerBucket = await clBucket.findOne(coworkerQuery);
        if (coworkerBucket) {
            await clBucket.updateOne(coworkerQuery, {
                $set: { 'coworkers.$.nickname': nickname },
            });
        }
        else {
            await clBucket.updateOne({ name: bucket }, {
                $push: { coworkers: { id: invitee, nickname } },
            });
        }
        return clLog
            .updateOne({ _id: new ObjectId(invite._id) }, { $set: { invitee, acceptAt: new Date(Date.now() + 3600 * 8 * 1000) } })
            .then(() => new tms_koa_1.ResultData('ok'));
    }
}
exports.default = Invite;
