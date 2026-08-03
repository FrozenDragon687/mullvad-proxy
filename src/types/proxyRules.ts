"use strict";

/**
 * Types for advanced proxy selection features:
 * - Location exclusion
 * - Per-site proxy rules
 * - Per-site-per-container proxy rules
 */

/**
 * Represents a proxy server reference for rules
 */
export interface ProxyRuleTarget {
    /** The socks hostname (e.g., "se1-wg.socks5.mullvad.net" or "se1") */
    proxyHost: string;
}

/**
 * Represents a site-specific proxy rule
 */
export interface SiteProxyRule extends ProxyRuleTarget {
    /** The site/domain pattern (e.g., "example.com", "*.example.com") */
    sitePattern: string;
}

/**
 * Represents a container-specific site proxy rule
 */
export interface ContainerSiteProxyRule extends ProxyRuleTarget {
    /** The site/domain pattern */
    sitePattern: string;
    /** The container identifier (e.g., "personal", "work", or Firefox container ID) */
    containerId: string;
}

/**
 * Complete proxy rules configuration
 */
export interface ProxyRulesConfig {
    /** List of country codes to exclude from proxy selection (e.g., ["us", "gb"]) */
    excludedLocations: string[];
    /** List of per-site proxy rules */
    siteRules: SiteProxyRule[];
    /** List of per-site-per-container proxy rules */
    containerSiteRules: ContainerSiteProxyRule[];
}

/**
 * Default empty rules configuration
 */
export const defaultProxyRules: ProxyRulesConfig = {
    excludedLocations: [],
    siteRules: [],
    containerSiteRules: []
};

/**
 * Helper to check if a location is excluded
 */
export function isLocationExcluded(
    countryCode: string,
    excludedLocations: string[]
): boolean {
    return excludedLocations.some(
        excluded => excluded.toLowerCase() === countryCode.toLowerCase()
    );
}

/**
 * Helper to match a URL against a site pattern
 * Supports exact matches and wildcard patterns (e.g., "*.example.com")
 */
export function matchesSitePattern(url: string, pattern: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const patternLower = pattern.toLowerCase();

        // Exact match
        if (hostname === patternLower) {
            return true;
        }

        // Wildcard match (e.g., "*.example.com")
        if (patternLower.startsWith("*.")) {
            const domain = patternLower.slice(2); // Remove "*."
            // Check if hostname ends with the domain
            if (hostname === domain || hostname.endsWith(`.${domain}`)) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Find matching site rule for a given URL
 * Returns the first matching rule or null
 */
export function findMatchingSiteRule(
    url: string,
    siteRules: SiteProxyRule[]
): SiteProxyRule | null {
    for (const rule of siteRules) {
        if (matchesSitePattern(url, rule.sitePattern)) {
            return rule;
        }
    }
    return null;
}

/**
 * Find matching container-site rule for a given URL and container
 * Returns the first matching rule or null
 */
export function findMatchingContainerSiteRule(
    url: string,
    containerId: string | undefined,
    containerSiteRules: ContainerSiteProxyRule[]
): ContainerSiteProxyRule | null {
    if (!containerId) {
        return null;
    }

    for (const rule of containerSiteRules) {
        if (
            matchesSitePattern(url, rule.sitePattern) &&
            rule.containerId === containerId
        ) {
            return rule;
        }
    }
    return null;
}

/**
 * Get the proxy host for a given request based on rules precedence:
 * 1. Container-specific site rule (highest precedence)
 * 2. General site rule
 * 3. Default proxy (null if no rule matches)
 */
export function getProxyForRequest(
    url: string,
    containerId: string | undefined,
    rulesConfig: ProxyRulesConfig,
    defaultProxyHost: string | null
): string | null {
    // Check container-specific site rule first (highest precedence)
    const containerRule = findMatchingContainerSiteRule(
        url,
        containerId,
        rulesConfig.containerSiteRules
    );
    if (containerRule) {
        return containerRule.proxyHost;
    }

    // Check general site rule
    const siteRule = findMatchingSiteRule(url, rulesConfig.siteRules);
    if (siteRule) {
        return siteRule.proxyHost;
    }

    // Return default
    return defaultProxyHost;
}

/**
 * Filter servers based on excluded locations
 * Returns servers that are NOT in excluded locations
 */
export function filterServersByExcludedLocations<T extends { country_code: string }>(
    servers: T[],
    excludedLocations: string[]
): T[] {
    if (excludedLocations.length === 0) {
        return servers;
    }

    return servers.filter(
        server => !isLocationExcluded(server.country_code, excludedLocations)
    );
}
