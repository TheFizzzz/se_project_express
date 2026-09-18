const ClothingItem = require("../models/clothingItem");
const { NOT_FOUND, FORBIDDEN, createError } = require("../utils/errors");

const sendItem = (item, res) => {
  if (!item) {
    return res.status(NOT_FOUND).send({ message: "Clothing item not found" });
  }
  return res.send(item);
};

module.exports.getItems = (req, res, next) =>
  ClothingItem.find({})
    .then((items) => res.send(items))
    .catch(next);

module.exports.createClothingItem = (req, res, next) => {
  const { name, weather, imageUrl } = req.body;
  return ClothingItem.create({ name, weather, imageUrl, owner: req.user._id })
    .then((item) => res.status(201).send(item))
    .catch(next);
};

module.exports.deleteItem = (req, res, next) =>
  ClothingItem.findById(req.params.itemId)
    .then((item) => {
      if (!item) throw createError(NOT_FOUND, "Clothing item not found");
      if (item.owner.toString() !== req.user._id) {
        throw createError(
          FORBIDDEN,
          "You can only delete your own clothing items"
        );
      }
      return ClothingItem.findOneAndDelete({
        _id: item._id,
        owner: req.user._id,
      });
    })
    .then((item) => sendItem(item, res))
    .catch(next);

module.exports.likeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $addToSet: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .then((item) => sendItem(item, res))
    .catch(next);

module.exports.dislikeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $pull: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .then((item) => sendItem(item, res))
    .catch(next);
