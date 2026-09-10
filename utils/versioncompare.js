/**
 * Tiny semver-style comparison — no external dependency.
 * Handles "1.2.0", "v1.2.0", "1.2.0+16" (build metadata), "1.2.0-beta" (pre-release).
 * Build metadata and pre-release tags are ignored for the comparison.
 *
 *   compareVersions("1.2.0", "1.10.0")  => -1   (a < b)
 *   compareVersions("1.2.0", "1.2.0")   =>  0   (equal)
 *   compareVersions("2.0.0", "1.9.9")   =>  1   (a > b)
 */
function normalize(v) {
  return String(v == null ? "0" : v)
    .trim()
    .replace(/^v/i, "")
    .split("+")[0] // strip "+16" build metadata
    .split("-")[0] // strip "-beta" pre-release
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = normalize(a);
  const pb = normalize(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

module.exports = { compareVersions };