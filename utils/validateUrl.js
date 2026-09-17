const validator = require("validator");

module.exports = (value) =>
  validator.isURL(value, {
    protocols: ["http", "https"],
    require_protocol: true,
  });
