import { Base } from './base';
export declare class Collection extends Base {
    constructor(mongoClient: any, bucket: any, client: any, config: any);
    getSchemaByCollection(tmwCl: any): Promise<any>;
    static getCollection(existDb: any, clName: any): Promise<any>;
    checkClName(clName: any): any[];
    byName(db: any, clName: any): Promise<any>;
    bySysname(db: any, clSysname: any): Promise<any>;
    checkRemoveConstraint(tmwCl: any, query: any, sysCl: any): Promise<boolean>;
}
