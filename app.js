require("dotenv").config({ quiet: true });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { errors } = require("celebrate");
const User = require("./models/user");
const router = require("./routes");
const errorHandler = require("./middlewares/error-handler");
const { requestLogger, errorLogger } = require("./middlewares/logger");

const { PORT = 3001, MONGODB_URI = "mongodb://127.0.0.1:27017/wtwr_db" } =
  process.env;
const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/crash-test", () => {
  setTimeout(() => {
    throw new Error("Server will crash now");
  }, 0);
});

app.use(router);
app.use(errorLogger);
app.use(errors());
app.use(errorHandler);

if (require.main === module) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => User.init())
    .then(() => {
      app.listen(PORT);
    })
    .catch((err) => {
      console.error(err);
      process.stderr.write(
        "Unable to initialize MongoDB. Check the connection and unique email index.\n"
      );
      process.exitCode = 1;
    });
}

module.exports = app;
