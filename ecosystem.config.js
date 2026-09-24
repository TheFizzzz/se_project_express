require("dotenv").config({ quiet: true });

module.exports = {
  apps: [
    {
      name: "wtwr-api",
      script: "./app.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "development",
        PORT: process.env.PORT || 3001,
        MONGODB_URI:
          process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wtwr_db",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3001,
        MONGODB_URI:
          process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wtwr_db",
        JWT_SECRET: process.env.JWT_SECRET,
      },
    },
  ],
};
