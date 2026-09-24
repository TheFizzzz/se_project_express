const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { JWT_SECRET } = require("../utils/config");
const { BadRequestError, NotFoundError, ConflictError } = require("../errors");

const sendUser = (user, res) => {
  if (!user) throw new NotFoundError("User not found");
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
      throw new BadRequestError(
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
    if (err.name === "ValidationError" || err.name === "CastError") {
      return next(new BadRequestError("Invalid request data or ID"));
    }
    if (err.code === 11000) {
      return next(new ConflictError("Email is already registered"));
    }
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
    return next(new BadRequestError("Email and password are required strings"));
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
    .catch((err) => {
      if (err.name === "ValidationError" || err.name === "CastError") {
        return next(new BadRequestError("Invalid request data or ID"));
      }
      return next(err);
    });
};
