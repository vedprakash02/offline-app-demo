const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const { getJwtSecret } = require("../config/security.js");
const auth = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Access Denied: No Token Provided" });
  try {
    const verified = jwt.verify(token, getJwtSecret());
    const user = await User.findById(verified.id).select("username role active permissions").lean();
    if (!user || user.active === false) return res.status(403).json({ message: "User account inactive hai." });
    req.user = { id: String(user._id), username: user.username, role: user.role, permissions: user.permissions || [] };
    next();
  } catch (_error) { res.status(400).json({ message: "Invalid token" }); }
};
module.exports = auth;