const { Joi, celebrate } = require("celebrate");
const validator = require("validator");

const validateURL = (value, helpers) => {
  if (
    validator.isURL(value, {
      protocols: ["http", "https"],
      require_protocol: true,
    })
  ) {
    return value;
  }
  return helpers.error("string.uri");
};

const name = Joi.string().min(2).max(30).messages({
  "string.min": 'The minimum length of the "name" field is 2',
  "string.max": 'The maximum length of the "name" field is 30',
  "string.empty": 'The "name" field must be filled in',
});

const url = (field) =>
  Joi.string()
    .custom(validateURL)
    .messages({
      "string.empty": `The "${field}" field must be filled in`,
      "string.uri": `The "${field}" field must be a valid url`,
    });

module.exports.validateCardBody = celebrate({
  body: Joi.object()
    .keys({
      name: name.required(),
      weather: Joi.string().required().valid("hot", "warm", "cold"),
      imageUrl: url("imageUrl").required(),
    })
    .unknown(true),
});

module.exports.validateUserBody = celebrate({
  body: Joi.object().keys({
    name: name.required(),
    avatar: url("avatar").required(),
    email: Joi.string().required().trim().email(),
    password: Joi.string().required(),
  }),
});

module.exports.validateLoginBody = celebrate({
  body: Joi.object().keys({
    email: Joi.string().required().trim().email(),
    password: Joi.string().required(),
  }),
});

module.exports.validateUserUpdate = celebrate({
  body: Joi.object()
    .keys({
      name,
      avatar: url("avatar"),
    })
    .unknown(true),
});

module.exports.validateId = celebrate({
  params: Joi.object().keys({
    itemId: Joi.string().required().hex().length(24),
  }),
});
