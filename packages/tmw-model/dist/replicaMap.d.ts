export declare class ReplicaMap {
    constructor(dbClient: any);
    get dbClient(): any;
    check(replicaMap: any): (string | boolean)[];
    synchronize(pri: any, sec: any, limit: any): Promise<{
        replacedCount: any;
        deletedCount: any;
    }>;
}
