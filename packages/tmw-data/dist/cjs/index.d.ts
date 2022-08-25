export interface PluginProfile {
    name: string;
    scope: string;
    title: string;
    description: string;
    disabled?: boolean;
    visible?: any;
    transData?: string;
    excludeTags?: string[];
    everyTags?: string[];
    someTags?: string[];
    beforeWidget?: {
        name: string;
        remoteWidgetOptions?: any;
    };
}
