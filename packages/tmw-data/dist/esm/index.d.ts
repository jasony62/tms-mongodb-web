export interface PluginProfile {
    name: string;
    scope: string;
    title: string;
    description: string;
    disabled?: boolean;
    visible?: any;
    transData?: string;
    bucketName?: RegExp;
    dbName?: RegExp;
    clName?: RegExp;
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
