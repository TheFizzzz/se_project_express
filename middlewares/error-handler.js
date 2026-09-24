const { BadRequestError } = require("../errors");

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const error =
    err.type === "entity.parse.failed"
      ? new BadRequestError("Invalid JSON body")
      : err;
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? "An error has occurred on the server." : error.message;

  return res.status(statusCode).send({ message });
};
