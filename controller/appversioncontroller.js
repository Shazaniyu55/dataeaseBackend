const AppVersion = require("../model/appversionmodel");
const { compareVersions } = require("../utils/versioncompare");

const AppVersionController = {
  /**
   * PUBLIC
   * GET /api/v2/app-version/check?platform=android&version=1.0.0
   *
   * The mobile app calls this on launch. No auth — it must work before login.
   * Returns whether an update is available and whether it is forced.
   */
  checkVersion: async (req, res) => {
    try {
      const platform = String(req.query.platform || "android")
        .toLowerCase()
        .trim();
      // The version the user is currently running. Missing => treat as very old.
      const currentVersion = String(req.query.version || "0.0.0").trim();

      const config = await AppVersion.findOne({ platform });

      // No config for this platform yet → don't block anyone (fail open).
      if (!config) {
        return res.status(200).json({
          success: true,
          status: 200,
          message: "No version policy configured",
          data: {
            platform,
            currentVersion,
            latestVersion: currentVersion,
            minSupportedVersion: currentVersion,
            updateAvailable: false,
            forceUpdate: false,
            updateUrl: "",
            releaseNotes: "",
            forceMessage: "",
          },
        });
      }

      const isBelowLatest =
        compareVersions(currentVersion, config.latestVersion) < 0;
      const isBelowMin =
        compareVersions(currentVersion, config.minSupportedVersion) < 0;

      const updateAvailable = isBelowLatest;
      // Forced when: below the minimum supported version, OR the admin flipped
      // the master forceUpdate flag and the user isn't yet on the latest.
      const forceUpdate = isBelowMin || (config.forceUpdate && isBelowLatest);

      return res.status(200).json({
        success: true,
        status: 200,
        message: "Version checked",
        data: {
          platform,
          currentVersion,
          latestVersion: config.latestVersion,
          minSupportedVersion: config.minSupportedVersion,
          updateAvailable,
          forceUpdate,
          updateUrl: config.updateUrl || "",
          releaseNotes: config.releaseNotes || "",
          forceMessage: config.forceMessage || "",
        },
      });
    } catch (err) {
      console.log("Error in checkVersion:", err);
      // On error, never lock users out.
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Version check failed, allowing access",
        data: { updateAvailable: false, forceUpdate: false },
      });
    }
  },

  /**
   * ADMIN
   * GET /admin/app-version
   * List the version policy for every platform.
   */
  getAppVersions: async (req, res) => {
    try {
      const versions = await AppVersion.find().sort({ platform: 1 });
      return res.status(200).json({ status: "success", data: versions });
    } catch (err) {
      return res.status(500).json({ status: "failed", message: err.message });
    }
  },

  /**
   * ADMIN
   * POST /admin/app-version
   * Create or update a platform's version policy.
   * Body: {
   *   platform: "android" | "ios",
   *   latestVersion: "1.2.0",
   *   minSupportedVersion: "1.1.0",
   *   forceUpdate?: boolean,
   *   updateUrl?: string,
   *   releaseNotes?: string,
   *   forceMessage?: string
   * }
   */
  setAppVersion: async (req, res) => {
    try {
      const adminId = req.user.userId;
      const {
        platform,
        latestVersion,
        minSupportedVersion,
        forceUpdate,
        updateUrl,
        releaseNotes,
        forceMessage,
      } = req.body;

      if (!platform || !["android", "ios"].includes(String(platform).toLowerCase())) {
        return res.status(400).json({
          status: "failed",
          message: "platform must be 'android' or 'ios'",
        });
      }
      if (!latestVersion) {
        return res
          .status(400)
          .json({ status: "failed", message: "latestVersion is required" });
      }
      if (!minSupportedVersion) {
        return res.status(400).json({
          status: "failed",
          message: "minSupportedVersion is required",
        });
      }
      if (compareVersions(minSupportedVersion, latestVersion) > 0) {
        return res.status(400).json({
          status: "failed",
          message: "minSupportedVersion cannot be greater than latestVersion",
        });
      }

      const update = {
        latestVersion: String(latestVersion).trim(),
        minSupportedVersion: String(minSupportedVersion).trim(),
        updatedBy: adminId,
      };
      if (typeof forceUpdate === "boolean") update.forceUpdate = forceUpdate;
      if (updateUrl !== undefined) update.updateUrl = updateUrl;
      if (releaseNotes !== undefined) update.releaseNotes = releaseNotes;
      if (forceMessage !== undefined) update.forceMessage = forceMessage;

      const doc = await AppVersion.findOneAndUpdate(
        { platform: String(platform).toLowerCase().trim() },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({
        status: "success",
        message: `Version policy for "${platform}" saved`,
        data: doc,
      });
    } catch (err) {
      console.log("Error in setAppVersion:", err);
      return res.status(500).json({ status: "failed", message: err.message });
    }
  },

  /**
   * ADMIN
   * DELETE /admin/app-version/:platform
   * Remove a platform's policy (nobody will be blocked for that platform).
   */
  deleteAppVersion: async (req, res) => {
    try {
      const { platform } = req.params;
      await AppVersion.findOneAndDelete({
        platform: String(platform).toLowerCase(),
      });
      return res.status(200).json({
        status: "success",
        message: `Version policy for "${platform}" removed`,
      });
    } catch (err) {
      return res.status(500).json({ status: "failed", message: err.message });
    }
  },
};

module.exports = AppVersionController;