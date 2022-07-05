import { Base } from './base';
export declare class Document extends Base {
    byId(existCl: any, id: any): Promise<any>;
    remove(existCl: any, id: any): Promise<any>;
    removeMany(existCl: any, query: any): Promise<any>;
    copyMany(existCl: any, query: any, targetCl: any): Promise<any>;
    update(existCl: any, id: any, updated: any): Promise<any>;
    updateMany(existCl: any, query: any, updated: any): Promise<any>;
    list(existCl: any, filter?: {}, orderBy?: {}, page?: number, size?: number, like?: boolean): Promise<{}[]>;
    byIds(existCl: any, ids: any, fields?: {}): Promise<any>;
    count(existCl: any, query: any): Promise<any>;
    dataActionLog(oDatas: any, operate_type: any, dbname: any, clname: any, operate_after_dbname?: string, operate_after_clname?: string, operate_before_data?: any, client_info?: any): Promise<boolean>;
    getDocCompleteStatus(existCl: any, docs: any): Promise<any>;
    getDocumentByIds(oldExistCl: any, ids: any, fields?: {}): Promise<any>;
    findUnRepeatRule(existCl: any): (boolean | {
        dbSysName: any;
        dbName: any;
        clSysName: any;
        clName: any;
        keys: any;
        insert: any;
    })[];
    getUnRepeatSQ(existSysCl: any, query: any, db: any, cl: any, keys: any): Promise<{
        targetSysCl: any;
        targetQuery: {};
    }>;
}
