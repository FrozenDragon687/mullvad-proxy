"use strict";

import { ProxyRulesConfig, defaultProxyRules } from "./types/proxyRules";

export interface Options {
    autoConnect: boolean;
    rememberConnectedServer: boolean;
    proxyDns: boolean;
    enableNotifications: boolean;
    enableNotificationsOnlyErrors: boolean;
    enableIpv6Lookups: boolean;
    enableDebugInfo: boolean;
    enableExcludeList: boolean;
    excludeList: string[];
    enableQuickConnect: boolean;
    // New advanced proxy selection features
    enableLocationExclusion: boolean;
    excludedLocations: string[];
    enableSiteRules: boolean;
    siteProxyRules: Array<{
        sitePattern: string;
        proxyHost: string;
    }>;
    enableContainerSiteRules: boolean;
    containerSiteProxyRules: Array<{
        sitePattern: string;
        proxyHost: string;
        containerId: string;
    }>;
}

export default {
    autoConnect: false,
    rememberConnectedServer: false,
    proxyDns: true,
    enableNotifications: true,
    enableIpv6Lookups: false,
    enableNotificationsOnlyErrors: false,
    enableDebugInfo: false,
    enableExcludeList: false,
    excludeList: [],
    enableQuickConnect: true,
    // New advanced proxy selection features - disabled by default for backward compatibility
    enableLocationExclusion: false,
    excludedLocations: [],
    enableSiteRules: false,
    siteProxyRules: [],
    enableContainerSiteRules: false,
    containerSiteProxyRules: []
} as Options;
