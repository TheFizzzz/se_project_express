const BadRequestError = require("./bad-request-error");
const UnauthorizedError = require("./unauthorized-error");
const ForbiddenError = require("./forbidden-error");
const NotFoundError = require("./not-found-error");
const ConflictError = require("./conflict-error");

module.exports = {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
