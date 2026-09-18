const router = require("express").Router();
const usersRouter = require("./users");
const itemsRouter = require("./clothingItems");
const { login, createUser } = require("../controllers/users");
const { getItems } = require("../controllers/clothingItems");
const auth = require("../middlewares/auth");
const { NOT_FOUND } = require("../utils/errors");

router.post("/signup", createUser);
router.post("/signin", login);
router.get("/items", getItems);
router.use(auth);
router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use((req, res) =>
  res.status(NOT_FOUND).send({ message: "Requested resource not found" })
);

module.exports = router;
