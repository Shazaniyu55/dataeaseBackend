const KillSwitch = require("../model/killswitchmodel");

// In-memory cache so we don't hit MongoDB on every single request
let cache = {};
const CACHE_TTL_MS = 30 * 1000; // refresh every 30 seconds

async function isFeatureActive(feature) {
  const now = Date.now();
  const cached = cache[feature];

  // Return cached value if fresh
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.active;
  }

  // Check "global" kill switch first — if global is off, EVERYTHING is off
  const globalSwitch = await KillSwitch.findOne({ feature: "global" });
  if (globalSwitch && !globalSwitch.isActive) {
    cache["global"] = { active: false, reason: globalSwitch.reason, at: now };
    return false;
  }

  const doc = await KillSwitch.findOne({ feature: feature.toLowerCase() });

  const active = doc ? doc.isActive : true; // default ON if not in DB
  const reason = doc?.reason ?? "This feature is temporarily unavailable.";

  cache[feature] = { active, reason, at: now };
  return active;
}

// Manually bust the cache (called after admin toggles)
function bustCache(feature) {
  if (feature) {
    delete cache[feature];
    delete cache["global"];
  } else {
    cache = {};
  }
}

/**
 * Factory — returns an Express middleware that gates a named feature.
 *
 * Usage in routes:
 *   router.post('/register', killSwitchGuard('registration'), handler);
 *   router.post('/buy-airtime', killSwitchGuard('vtu'), handler);
 */
function killSwitchGuard(feature) {
  return async (req, res, next) => {
    try {
      const now = Date.now();

      // 1. Check global kill first
      const globalCached = cache["global"];
      if (!globalCached || now - globalCached.at >= CACHE_TTL_MS) {
        const globalDoc = await KillSwitch.findOne({ feature: "global" });
        cache["global"] = {
          active: globalDoc ? globalDoc.isActive : true,
          reason: globalDoc?.reason ?? "Service temporarily unavailable.",
          at: now,
        };
      }

      if (!cache["global"].active) {
        return res.status(503).json({
          status: "failed",
          code: "SERVICE_UNAVAILABLE",
          message: cache["global"].reason,
        });
      }

      // 2. Check the specific feature
      const featureCached = cache[feature];
      if (!featureCached || now - featureCached.at >= CACHE_TTL_MS) {
        const doc = await KillSwitch.findOne({ feature: feature.toLowerCase() });
        cache[feature] = {
          active: doc ? doc.isActive : true,
          reason: doc?.reason ?? "This feature is temporarily unavailable.",
          at: now,
        };
      }

      if (!cache[feature].active) {
        return res.status(503).json({
          status: "failed",
          code: "FEATURE_DISABLED",
          feature,
          message: cache[feature].reason,
        });
      }

      next();
    } catch (err) {
      // On DB error, fail open (don't block users due to our own bug)
      console.error("[KillSwitch] DB check error:", err.message);
      next();
    }
  };
}

module.exports = { killSwitchGuard, bustCache, isFeatureActive };