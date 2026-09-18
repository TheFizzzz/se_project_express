const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const INTERNAL_SERVER_ERROR = 500;

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const handleError = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.name === "ValidationError" || err.name === "CastError") {
    return res
      .status(BAD_REQUEST)
      .send({ message: "Invalid request data or ID" });
  }
  if (err.code === 11000) {
    return res
      .status(CONFLICT)
      .send({ message: "Email is already registered" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(BAD_REQUEST).send({ message: "Invalid JSON body" });
  }
  if (
    [BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT].includes(
      err.statusCode
    )
  ) {
    return res.status(err.statusCode).send({ message: err.message });
  }
  return res.status(INTERNAL_SERVER_ERROR).send({
    message: "An error has occurred on the server.",
  });
};

module.exports = {
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  createError,
  handleError,
};
