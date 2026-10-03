const vtuPassService = require("../services/vtupassService");

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // serviceID -> { at, plans }

async function getPlans(serviceID) {
  const hit = cache.get(serviceID);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.plans;

  const { data } = await vtuPassService.getVariations(serviceID);
  if (!data || data.response_description !== "000") {
    throw new Error(`Could not load plans for ${serviceID}`);
  }
  const raw = data.content?.variations || data.content?.varations || [];
  const plans = raw.map((p) => ({
    code: p.variation_code,
    name: p.name,
    price: Number(p.variation_amount),
  }));
  cache.set(serviceID, { at: Date.now(), plans });
  return plans;
}

// The price VTpass really charges for this plan — never trust a client-sent amount.
async function getPlanPrice(serviceID, variationCode) {
  const plans = await getPlans(serviceID);
  const plan = plans.find((p) => p.code === variationCode);
  return plan && plan.price > 0 ? plan.price : null;
}

module.exports = { getPlans, getPlanPrice };