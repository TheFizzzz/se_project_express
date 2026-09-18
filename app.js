const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/user");
const router = require("./routes");
const { handleError } = require("./utils/errors");

const { PORT = 3001, MONGODB_URI = "mongodb://127.0.0.1:27017/wtwr_db" } =
  process.env;
const app = express();

app.use(cors());
app.use(express.json());
app.use(router);
app.use(handleError);

if (require.main === module) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => User.init())
    .then(() => {
      app.listen(PORT);
    })
    .catch(() => {
      process.stderr.write(
        "Unable to initialize MongoDB. Check the connection and unique email index.\n"
      );
      process.exitCode = 1;
    });
}

module.exports = app;
