const {
  NODE_ENV,
  JWT_SECRET = "wtwr-development-secret-change-before-deployment",
} = process.env;

if (NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

module.exports = { JWT_SECRET };
