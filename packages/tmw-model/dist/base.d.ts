export declare class Base {
    mongoClient: any;
    bucket: any;
    client: any;
    config: any;
    constructor(mongoClient: any, bucket: any, client: any, config: any);
    assembleQuery(filter: any, like?: boolean): {};
    toSkipAndLimit(page: any, size: any): {
        skip: number;
        limit: number;
    };
    beforeProcessByInAndUp(data: any, type: any): any;
}
