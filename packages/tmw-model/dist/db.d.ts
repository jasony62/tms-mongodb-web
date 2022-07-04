import { Base } from './base';
export declare class Db extends Base {
    checkDbName(dbName: any): any[];
    byName(dbName: any): Promise<any>;
}
