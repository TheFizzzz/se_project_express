const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { JWT_SECRET } = require("../utils/config");
const { BAD_REQUEST, NOT_FOUND, createError } = require("../utils/errors");

const sendUser = (user, res) => {
  if (!user) throw createError(NOT_FOUND, "User not found");
  return res.send(user);
};

module.exports.createUser = async (req, res, next) => {
  const { name, avatar, email, password } = req.body;
  try {
    if (
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      throw createError(
        BAD_REQUEST,
        "Password must be a nonempty string of at most 72 UTF-8 bytes"
      );
    }
    const user = new User({ name, avatar, email, password });
    await user.validate();
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    const result = user.toObject();
    delete result.password;
    return res.status(201).send(result);
  } catch (err) {
    return next(err);
  }
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return next(
      createError(BAD_REQUEST, "Email and password are required strings")
    );
  }
  return User.findUserByCredentials(email, password)
    .then((user) => {
      const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
        expiresIn: "7d",
      });
      return res.send({ token });
    })
    .catch(next);
};

module.exports.getCurrentUser = (req, res, next) =>
  User.findById(req.user._id)
    .then((user) => sendUser(user, res))
    .catch(next);

module.exports.updateUser = (req, res, next) => {
  const { name, avatar } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (avatar !== undefined) updates.avatar = avatar;
  return User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .then((user) => sendUser(user, res))
    .catch(next);
};
