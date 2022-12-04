export interface PluginProfile {
    name: string;
    scope: string;
    title: string;
    description: string;
    disabled?: boolean;
    visible?: any;
    amount?: string;
    bucketName?: RegExp;
    dbName?: RegExp;
    clName?: RegExp;
    schemaName?: RegExp;
    excludeTags?: string[];
    everyTags?: string[];
    someTags?: string[];
    beforeWidget?: {
        name: string;
        remoteWidgetOptions?: boolean;
        url?: string;
        size?: string;
        [k: string]: any;
    };
    remoteWidgetOptions?: Function;
}
