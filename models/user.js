const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const validateUrl = require("../utils/validateUrl");
const { UNAUTHORIZED, createError } = require("../utils/errors");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2, maxlength: 30 },
  avatar: {
    type: String,
    required: true,
    validate: { validator: validateUrl, message: "You must enter a valid URL" },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: "You must enter a valid email address",
    },
  },
  password: { type: String, required: true, select: false },
});

userSchema.statics.findUserByCredentials = async function findUserByCredentials(
  email,
  password
) {
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw createError(UNAUTHORIZED, "Incorrect email or password");
  }
  const user = await this.findOne({ email: email.trim().toLowerCase() }).select(
    "+password"
  );
  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw createError(UNAUTHORIZED, "Incorrect email or password");
  }
  return user;
};

module.exports = mongoose.model("user", userSchema);
