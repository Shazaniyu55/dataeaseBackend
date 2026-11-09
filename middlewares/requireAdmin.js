// Must run after authMiddleware, which sets req.isAdmin
const requireAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      status: 403,
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

module.exports = requireAdmin;