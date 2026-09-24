const ClothingItem = require("../models/clothingItem");
const { BadRequestError, NotFoundError, ForbiddenError } = require("../errors");

const sendItem = (item, res) => {
  if (!item) {
    throw new NotFoundError("Clothing item not found");
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
    .catch((err) => {
      if (err.name === "ValidationError" || err.name === "CastError") {
        return next(new BadRequestError("Invalid request data or ID"));
      }
      return next(err);
    });
};

module.exports.deleteItem = (req, res, next) =>
  ClothingItem.findById(req.params.itemId)
    .then((item) => {
      if (!item) throw new NotFoundError("Clothing item not found");
      if (item.owner.toString() !== req.user._id) {
        throw new ForbiddenError("You can only delete your own clothing items");
      }
      return ClothingItem.findOneAndDelete({
        _id: item._id,
        owner: req.user._id,
      });
    })
    .then((item) => sendItem(item, res))
    .catch((err) => {
      if (err.name === "CastError") {
        return next(
          new BadRequestError("The id string is in an invalid format")
        );
      }
      return next(err);
    });

module.exports.likeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $addToSet: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .then((item) => sendItem(item, res))
    .catch((err) => {
      if (err.name === "CastError") {
        return next(
          new BadRequestError("The id string is in an invalid format")
        );
      }
      return next(err);
    });

module.exports.dislikeItem = (req, res, next) =>
  ClothingItem.findByIdAndUpdate(
    req.params.itemId,
    { $pull: { likes: req.user._id } },
    { new: true, runValidators: true }
  )
    .then((item) => sendItem(item, res))
    .catch((err) => {
      if (err.name === "CastError") {
        return next(
          new BadRequestError("The id string is in an invalid format")
        );
      }
      return next(err);
    });
