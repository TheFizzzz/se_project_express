const router = require("express").Router();
const usersRouter = require("./users");
const itemsRouter = require("./clothingItems");
const { login, createUser } = require("../controllers/users");
const { getItems } = require("../controllers/clothingItems");
const auth = require("../middlewares/auth");
const {
  validateUserBody,
  validateLoginBody,
} = require("../middlewares/validation");
const { NotFoundError } = require("../errors");

router.post("/signup", validateUserBody, createUser);
router.post("/signin", validateLoginBody, login);
router.get("/items", getItems);
router.use(auth);
router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use((req, res, next) =>
  next(new NotFoundError("Requested resource not found"))
);

module.exports = router;
