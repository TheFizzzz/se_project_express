const User = require("../models/user");
const { NOT_FOUND } = require("../utils/errors");

module.exports.getUsers = (req, res, next) =>
  User.find({})
    .then((users) => res.send(users))
    .catch(next);

module.exports.getUser = (req, res, next) =>
  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return res.status(NOT_FOUND).send({ message: "User not found" });
      }
      return res.send(user);
    })
    .catch(next);

module.exports.createUser = (req, res, next) => {
  const { name, avatar } = req.body;
  return User.create({ name, avatar })
    .then((user) => res.status(201).send(user))
    .catch(next);
};
