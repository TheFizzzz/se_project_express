const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const { UNAUTHORIZED, createError } = require("../utils/errors");

module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return next(createError(UNAUTHORIZED, "Authorization required"));
  }
  try {
    const token = authorization.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (
      !payload ||
      typeof payload._id !== "string" ||
      !/^[a-f0-9]{24}$/i.test(payload._id)
    ) {
      return next(createError(UNAUTHORIZED, "Invalid authorization token"));
    }
    req.user = payload;
    return next();
  } catch (err) {
    return next(
      createError(UNAUTHORIZED, "Invalid or expired authorization token")
    );
  }
};
