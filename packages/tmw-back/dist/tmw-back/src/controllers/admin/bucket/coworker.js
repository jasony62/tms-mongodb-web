"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tms_koa_1 = require("tms-koa");
const base_1 = require("@/controllers/base");
const nanoid_1 = require("nanoid");
const dayjs = require("dayjs");
const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectId;
class Coworker extends base_1.default {
    constructor(...args) {
        super(...args);
    }
    async tmsBeforeEach() {
        const { url } = this["request"];
        if (!this["client"])
            return new tms_koa_1.ResultFault('只有通过认证的用户才可以执行该操作');
        if (url.split('?')[0].split('/').pop() === 'accept')
            return true;
        let result = await super.tmsBeforeEach();
        if (true !== result)
            return result;
        return true;
    }
    async invite() {
        if (!this["bucket"])
            return new tms_koa_1.ResultFault('没有指定邀请的空间');
        const { nickname } = this["request"].body;
        if (!nickname)
            return new tms_koa_1.ResultFault('没有指定被邀请用户的昵称');
        const clBkt = this["mongoClient"].db('tms_admin').collection('bucket');
        const coworkerBucket = await clBkt.findOne({
            name: this["bucket"].name,
            'coworkers.nickname': nickname,
        });
        const coworkerInfo = await clBkt.findOne({
            name: this["bucket"].name
        });
        if (this["client"].id !== coworkerInfo.creator)
            return new tms_koa_1.ResultFault(`没有权限`);
        if (coworkerBucket)
            return new tms_koa_1.ResultFault(`用户【${nickname}】已经是授权用户，不能重复邀请`);
        const clLog = this["mongoClient"]
            .db('tms_admin')
            .collection('bucket_invite_log');
        const inviteLog = await clLog.findOne({
            bucket: this["bucket"].name,
            nickname,
            acceptAt: { $exists: false },
        });
        if (inviteLog) {
            await clLog.updateOne({ _id: new ObjectId(inviteLog._id) }, { $set: { expireAt: new Date(Date.now() + (3600 * 8 + 1800) * 1000) } });
            return new tms_koa_1.ResultData(inviteLog.code);
        }
        let tries = 0, existInvite;
        let code = (0, nanoid_1.nanoid)(4);
        while (tries <= 2) {
            existInvite = await clLog.findOne({ bucket: this["bucket"].name, code });
            if (!existInvite)
                break;
            code = (0, nanoid_1.nanoid)(4);
            tries++;
        }
        if (existInvite)
            return new tms_koa_1.ResultFault('无法生成有效的邀请码');
        const now = new Date();
        const createAt = new Date(now.getTime() + 3600 * 8 * 1000);
        const expireAt = new Date(createAt.getTime() + 1800 * 1000);
        const invite = {
            inviter: this["client"].id,
            bucket: this["bucket"].name,
            code,
            createAt,
            expireAt,
            nickname,
        };
        return clLog.insertOne(invite).then(() => new tms_koa_1.ResultData(code));
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
        if (nickname !== (this["client"] && this["client"].id))
            return new tms_koa_1.ResultFault('用户信息不匹配');
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
        const current = dayjs(new Date(Date.now() + 3600 * 8 * 1000));
        let accept_time = current.format('YYYY-MM-DD HH:mm:ss');
        const invitee = this["client"].id;
        const clBucket = this["mongoClient"].db('tms_admin').collection('bucket');
        const coworkerQuery = {
            name: bucket,
            'coworkers.id': invitee
        };
        const coworkerBucket = await clBucket.findOne(coworkerQuery);
        if (coworkerBucket) {
            await clBucket.updateOne(coworkerQuery, {
                $set: { 'coworkers.$.nickname': nickname, 'coworkers.$.change_time': accept_time },
            });
        }
        else {
            await clBucket.updateOne({ name: bucket }, {
                $push: { coworkers: { id: invitee, nickname, accept_time: accept_time } },
            });
        }
        return clLog
            .updateOne({ _id: new ObjectId(invite._id) }, { $set: { invitee, acceptAt: accept_time } })
            .then(() => new tms_koa_1.ResultData('ok'));
    }
    async remove() {
        if (!this["bucket"])
            return new tms_koa_1.ResultFault('没有指定邀请的空间');
        const { coworker } = this["request"].query;
        const clBkt = this["mongoClient"].db('tms_admin').collection('bucket');
        const coworkerBucket = await clBkt.findOne({
            name: this["bucket"].name,
            'coworkers.id': { $in: [coworker, parseInt(coworker)] },
        });
        if (!coworkerBucket)
            return new tms_koa_1.ResultFault('指定的用户不存在');
        return clBkt
            .updateOne({
            _id: new ObjectId(coworkerBucket._id),
        }, {
            $pull: { coworkers: { id: { $in: [coworker, parseInt(coworker)] } } },
        })
            .then(() => new tms_koa_1.ResultData('ok'));
    }
}
exports.default = Coworker;
