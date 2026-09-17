const express = require("express");
const mongoose = require("mongoose");
const router = require("./routes");
const { handleError } = require("./utils/errors");

const { PORT = 3001, MONGODB_URI = "mongodb://127.0.0.1:27017/wtwr_db" } =
  process.env;
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  // Sprint 12: every request acts as this test user until real auth is added.
  req.user = { _id: "6aabdca4b4ec4d6640a397d8" };
  next();
});
app.use(router);
app.use(handleError);

if (require.main === module) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      app.listen(PORT);
    })
    .catch(() => {
      process.stderr.write(
        "Unable to connect to MongoDB. Check that it is running.\n"
      );
      process.exitCode = 1;
    });
}

module.exports = app;
