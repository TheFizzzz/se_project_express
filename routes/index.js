const router = require("express").Router();
const usersRouter = require("./users");
const itemsRouter = require("./clothingItems");
const { NOT_FOUND } = require("../utils/errors");

router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use((req, res) =>
  res.status(NOT_FOUND).send({ message: "Requested resource not found" })
);

module.exports = router;
