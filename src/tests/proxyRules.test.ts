"use strict";

import {
    isLocationExcluded,
    matchesSitePattern,
    findMatchingSiteRule,
    findMatchingContainerSiteRule,
    getProxyForRequest,
    filterServersByExcludedLocations,
    ProxyRulesConfig,
    SiteProxyRule,
    ContainerSiteProxyRule
} from "../types/proxyRules";

// Mock server type for testing
interface TestServer {
    country_code: string;
    hostname: string;
}

describe("Proxy Rules Tests", () => {
    describe("Location Exclusion", () => {
        test("should exclude location when country code matches", () => {
            const excludedLocations = ["us", "gb", "de"];
            expect(isLocationExcluded("US", excludedLocations)).toBe(true);
            expect(isLocationExcluded("us", excludedLocations)).toBe(true);
            expect(isLocationExcluded("GB", excludedLocations)).toBe(true);
            expect(isLocationExcluded("gb", excludedLocations)).toBe(true);
        });

        test("should not exclude location when country code does not match", () => {
            const excludedLocations = ["us", "gb", "de"];
            expect(isLocationExcluded("se", excludedLocations)).toBe(false);
            expect(isLocationExcluded("SE", excludedLocations)).toBe(false);
            expect(isLocationExcluded("fr", excludedLocations)).toBe(false);
        });

        test("should handle empty excluded locations list", () => {
            const excludedLocations: string[] = [];
            expect(isLocationExcluded("us", excludedLocations)).toBe(false);
            expect(isLocationExcluded("gb", excludedLocations)).toBe(false);
        });

        test("should filter servers by excluded locations", () => {
            const servers: TestServer[] = [
                { country_code: "se", hostname: "se1" },
                { country_code: "us", hostname: "us1" },
                { country_code: "gb", hostname: "gb1" },
                { country_code: "de", hostname: "de1" },
                { country_code: "fr", hostname: "fr1" }
            ];

            const excludedLocations = ["us", "gb"];
            const filtered = filterServersByExcludedLocations(
                servers as any,
                excludedLocations
            );

            expect(filtered).toHaveLength(3);
            expect(filtered.map(s => s.country_code)).toEqual(["se", "de", "fr"]);
        });

        test("should return all servers when no locations are excluded", () => {
            const servers: TestServer[] = [
                { country_code: "se", hostname: "se1" },
                { country_code: "us", hostname: "us1" },
                { country_code: "gb", hostname: "gb1" }
            ];

            const filtered = filterServersByExcludedLocations(servers as any, []);
            expect(filtered).toEqual(servers);
        });
    });

    describe("Site Pattern Matching", () => {
        test("should match exact hostname", () => {
            expect(matchesSitePattern("https://example.com/path", "example.com")).toBe(
                true
            );
            expect(matchesSitePattern("https://example.com", "example.com")).toBe(
                true
            );
        });

        test("should match wildcard patterns", () => {
            expect(
                matchesSitePattern("https://sub.example.com/path", "*.example.com")
            ).toBe(true);
            expect(
                matchesSitePattern("https://example.com/path", "*.example.com")
            ).toBe(true);
            expect(
                matchesSitePattern("https://deep.sub.example.com/path", "*.example.com")
            ).toBe(true);
        });

        test("should not match different domains", () => {
            expect(
                matchesSitePattern("https://example.org/path", "*.example.com")
            ).toBe(false);
            expect(
                matchesSitePattern("https://notexample.com/path", "example.com")
            ).toBe(false);
        });

        test("should handle case insensitivity", () => {
            expect(
                matchesSitePattern("https://EXAMPLE.COM/path", "example.com")
            ).toBe(true);
            expect(
                matchesSitePattern("https://example.com/path", "EXAMPLE.COM")
            ).toBe(true);
        });

        test("should handle invalid URLs gracefully", () => {
            expect(matchesSitePattern("invalid-url", "example.com")).toBe(false);
            expect(matchesSitePattern("", "example.com")).toBe(false);
        });
    });

    describe("Site Rule Matching", () => {
        test("should find matching site rule", () => {
            const siteRules: SiteProxyRule[] = [
                { sitePattern: "example.com", proxyHost: "se1-wg" },
                { sitePattern: "*.google.com", proxyHost: "de1-wg" },
                { sitePattern: "github.com", proxyHost: "us1-wg" }
            ];

            const rule = findMatchingSiteRule(
                "https://example.com/path",
                siteRules
            );
            expect(rule).not.toBeNull();
            expect(rule?.proxyHost).toBe("se1-wg");
        });

        test("should find matching wildcard site rule", () => {
            const siteRules: SiteProxyRule[] = [
                { sitePattern: "example.com", proxyHost: "se1-wg" },
                { sitePattern: "*.google.com", proxyHost: "de1-wg" }
            ];

            const rule = findMatchingSiteRule(
                "https://mail.google.com/path",
                siteRules
            );
            expect(rule).not.toBeNull();
            expect(rule?.proxyHost).toBe("de1-wg");
        });

        test("should return null when no rule matches", () => {
            const siteRules: SiteProxyRule[] = [
                { sitePattern: "example.com", proxyHost: "se1-wg" }
            ];

            const rule = findMatchingSiteRule(
                "https://notexample.com/path",
                siteRules
            );
            expect(rule).toBeNull();
        });

        test("should return first matching rule", () => {
            const siteRules: SiteProxyRule[] = [
                { sitePattern: "*.example.com", proxyHost: "se1-wg" },
                { sitePattern: "example.com", proxyHost: "de1-wg" }
            ];

            const rule = findMatchingSiteRule(
                "https://example.com/path",
                siteRules
            );
            expect(rule).not.toBeNull();
            expect(rule?.proxyHost).toBe("se1-wg"); // First match
        });
    });

    describe("Container Site Rule Matching", () => {
        test("should find matching container site rule", () => {
            const containerSiteRules: ContainerSiteProxyRule[] = [
                {
                    sitePattern: "example.com",
                    proxyHost: "se1-wg",
                    containerId: "personal"
                },
                {
                    sitePattern: "example.com",
                    proxyHost: "de1-wg",
                    containerId: "work"
                }
            ];

            const rule = findMatchingContainerSiteRule(
                "https://example.com/path",
                "personal",
                containerSiteRules
            );
            expect(rule).not.toBeNull();
            expect(rule?.proxyHost).toBe("se1-wg");
        });

        test("should return null when container does not match", () => {
            const containerSiteRules: ContainerSiteProxyRule[] = [
                {
                    sitePattern: "example.com",
                    proxyHost: "se1-wg",
                    containerId: "personal"
                }
            ];

            const rule = findMatchingContainerSiteRule(
                "https://example.com/path",
                "work",
                containerSiteRules
            );
            expect(rule).toBeNull();
        });

        test("should return null when no container ID provided", () => {
            const containerSiteRules: ContainerSiteProxyRule[] = [
                {
                    sitePattern: "example.com",
                    proxyHost: "se1-wg",
                    containerId: "personal"
                }
            ];

            const rule = findMatchingContainerSiteRule(
                "https://example.com/path",
                undefined,
                containerSiteRules
            );
            expect(rule).toBeNull();
        });

        test("should match both site pattern and container", () => {
            const containerSiteRules: ContainerSiteProxyRule[] = [
                {
                    sitePattern: "*.example.com",
                    proxyHost: "se1-wg",
                    containerId: "personal"
                }
            ];

            const rule = findMatchingContainerSiteRule(
                "https://mail.example.com/path",
                "personal",
                containerSiteRules
            );
            expect(rule).not.toBeNull();
            expect(rule?.proxyHost).toBe("se1-wg");
        });
    });

    describe("Proxy Selection Precedence", () => {
        test("should prioritize container-specific rule over site rule", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [
                    { sitePattern: "example.com", proxyHost: "site-proxy" }
                ],
                containerSiteRules: [
                    {
                        sitePattern: "example.com",
                        proxyHost: "container-proxy",
                        containerId: "personal"
                    }
                ]
            };

            const proxy = getProxyForRequest(
                "https://example.com/path",
                "personal",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy).toBe("container-proxy");
        });

        test("should use site rule when no container rule matches", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [
                    { sitePattern: "example.com", proxyHost: "site-proxy" }
                ],
                containerSiteRules: [
                    {
                        sitePattern: "example.com",
                        proxyHost: "container-proxy",
                        containerId: "work"
                    }
                ]
            };

            const proxy = getProxyForRequest(
                "https://example.com/path",
                "personal",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy).toBe("site-proxy");
        });

        test("should use default proxy when no rules match", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [
                    { sitePattern: "other.com", proxyHost: "site-proxy" }
                ],
                containerSiteRules: []
            };

            const proxy = getProxyForRequest(
                "https://example.com/path",
                "personal",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy).toBe("default-proxy");
        });

        test("should return null when no default proxy and no rules match", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [],
                containerSiteRules: []
            };

            const proxy = getProxyForRequest(
                "https://example.com/path",
                "personal",
                rulesConfig,
                null
            );
            expect(proxy).toBeNull();
        });

        test("should handle complex precedence with multiple rules", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [
                    { sitePattern: "*.example.com", proxyHost: "wildcard-site-proxy" },
                    { sitePattern: "example.com", proxyHost: "exact-site-proxy" }
                ],
                containerSiteRules: [
                    {
                        sitePattern: "mail.example.com",
                        proxyHost: "mail-container-proxy",
                        containerId: "work"
                    },
                    {
                        sitePattern: "*.example.com",
                        proxyHost: "wildcard-container-proxy",
                        containerId: "personal"
                    }
                ]
            };

            // Container-specific rule should win
            const proxy1 = getProxyForRequest(
                "https://mail.example.com/path",
                "work",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy1).toBe("mail-container-proxy");

            // Site rule should be used when container doesn't match
            const proxy2 = getProxyForRequest(
                "https://example.com/path",
                "work",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy2).toBe("exact-site-proxy");
        });
    });

    describe("Edge Cases", () => {
        test("should handle empty rules config", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [],
                containerSiteRules: []
            };

            const proxy = getProxyForRequest(
                "https://example.com/path",
                "personal",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy).toBe("default-proxy");
        });

        test("should handle malformed URLs", () => {
            const rulesConfig: ProxyRulesConfig = {
                excludedLocations: [],
                siteRules: [
                    { sitePattern: "example.com", proxyHost: "site-proxy" }
                ],
                containerSiteRules: []
            };

            const proxy = getProxyForRequest(
                "not-a-valid-url",
                "personal",
                rulesConfig,
                "default-proxy"
            );
            expect(proxy).toBe("default-proxy");
        });

        test("should handle empty site patterns", () => {
            const siteRules: SiteProxyRule[] = [
                { sitePattern: "", proxyHost: "empty-proxy" }
            ];

            const rule = findMatchingSiteRule("https://example.com/path", siteRules);
            expect(rule).toBeNull();
        });

        test("should handle empty container IDs", () => {
            const containerSiteRules: ContainerSiteProxyRule[] = [
                {
                    sitePattern: "example.com",
                    proxyHost: "empty-container-proxy",
                    containerId: ""
                }
            ];

            const rule = findMatchingContainerSiteRule(
                "https://example.com/path",
                "",
                containerSiteRules
            );
            expect(rule).toBeNull();
        });
    });
});
