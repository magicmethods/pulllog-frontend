/**
 * Feature flag definitions
 */
declare global {
    /** Known feature flag keys. Extendable for future flags. */
    type FeatureFlagName = "StatsLayoutSync" | (string & {})

    /** Feature flag map keyed by flag name. */
    type FeatureFlagMap = Partial<Record<FeatureFlagName, boolean>>
}
export {}
