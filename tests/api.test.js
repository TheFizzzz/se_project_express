const assert = require("node:assert/strict");
const { test } = require("node:test");
const { once } = require("node:events");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/user");

test("WTWR API with MongoDB", async (t) => {
  // A uniquely named database keeps the application's wtwr_db untouched.
  await mongoose.connect("mongodb://127.0.0.1:27017", {
    dbName: `wtwr_test_${process.pid}_${Date.now()}`,
    serverSelectionTimeoutMS: 3000,
  });
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const request = async (path, method = "GET", body = undefined) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const expectError = (response, status) => {
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(response.body), ["message"]);
    assert.equal(typeof response.body.message, "string");
  };
  const userData = {
    name: "Test User",
    avatar: "https://example.com/avatar.png",
  };
  const itemData = {
    name: "Winter coat",
    weather: "cold",
    imageUrl: "https://example.com/coat.png",
  };
  const missingId = "000000000000000000000000";
  let userId;
  let itemId;
  let owner;

  await t.test("creates, lists, and retrieves users", async () => {
    const created = await request("/users", "POST", userData);
    assert.equal(created.status, 201);
    assert.equal(created.body.name, userData.name);
    userId = created.body._id;
    const found = await request(`/users/${userId}`);
    assert.equal(found.status, 200);
    assert.equal(found.body.avatar, userData.avatar);
    const users = await request("/users");
    assert.equal(users.status, 200);
    assert.equal(users.body.length, 1);
  });

  await t.test("validates required fields, name limits, and URLs", async () => {
    const invalidUsers = [
      {},
      { ...userData, name: "A" },
      { ...userData, name: "A".repeat(31) },
      { ...userData, avatar: "https://thisisnotvalidurl" },
      { ...userData, avatar: "https://x~>!" },
    ];
    await Promise.all(
      invalidUsers.map(async (body) => {
        expectError(await request("/users", "POST", body), 400);
      })
    );
    const validUrls = [
      "http://example.com/",
      "https://www.example.com/",
      "http://1-example.com",
      "http://example.com/go/even/deeper/",
      "http://example-example-example.com",
    ];
    await Promise.all(
      validUrls.map(async (avatar) => {
        const result = await request("/users", "POST", { ...userData, avatar });
        assert.equal(result.status, 201);
      })
    );
    const invalidItems = [
      {},
      { ...itemData, name: "A" },
      { ...itemData, name: "A".repeat(31) },
      { ...itemData, weather: "freezing" },
      { ...itemData, weather: null },
      { ...itemData, imageUrl: "not-a-url" },
    ];
    await Promise.all(
      invalidItems.map(async (body) => {
        expectError(await request("/items", "POST", body), 400);
      })
    );
  });

  await t.test(
    "creates items with server-controlled ownership and defaults",
    async () => {
      const created = await request("/items", "POST", {
        ...itemData,
        owner: missingId,
        likes: [userId],
        createdAt: "2000-01-01",
      });
      assert.equal(created.status, 201);
      itemId = created.body._id;
      owner = created.body.owner;
      assert.match(owner, /^[a-f0-9]{24}$/);
      assert.notEqual(owner, missingId);
      assert.deepEqual(created.body.likes, []);
      assert.ok(Date.now() - Date.parse(created.body.createdAt) < 10000);
      const items = await request("/items");
      assert.equal(items.status, 200);
      assert.equal(items.body[0]._id, itemId);
    }
  );

  await t.test(
    "likes are unique and updated documents are returned",
    async () => {
      const responses = await Promise.all([
        request(`/items/${itemId}/likes`, "PUT"),
        request(`/items/${itemId}/likes`, "PUT"),
      ]);
      responses.forEach((response) => {
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.likes, [owner]);
      });
      const unliked = await request(`/items/${itemId}/likes`, "DELETE");
      assert.equal(unliked.status, 200);
      assert.deepEqual(unliked.body.likes, []);
      const repeated = await request(`/items/${itemId}/likes`, "DELETE");
      assert.equal(repeated.status, 200);
      assert.deepEqual(repeated.body.likes, []);
    }
  );

  await t.test(
    "invalid IDs return 400 and missing records return 404",
    async () => {
      const paths = [
        ["/users/", "", "GET"],
        ["/items/", "", "DELETE"],
        ["/items/", "/likes", "PUT"],
        ["/items/", "/likes", "DELETE"],
      ];
      await Promise.all(
        paths.map(async ([prefix, suffix, method]) => {
          expectError(
            await request(`${prefix}invalidid${suffix}`, method),
            400
          );
          expectError(
            await request(`${prefix}61cb4d051586a1fe37${suffix}`, method),
            400
          );
          expectError(
            await request(`${prefix}${missingId}${suffix}`, method),
            404
          );
        })
      );
    }
  );

  await t.test(
    "deletes an item and reports repeat deletion as missing",
    async () => {
      const deleted = await request(`/items/${itemId}`, "DELETE");
      assert.equal(deleted.status, 200);
      assert.equal(deleted.body._id, itemId);
      expectError(await request(`/items/${itemId}`, "DELETE"), 404);
      const items = await request("/items");
      assert.deepEqual(items.body, []);
    }
  );

  await t.test(
    "unknown routes and malformed JSON return JSON errors",
    async () => {
      const missing = await request("/not-a-route");
      expectError(missing, 404);
      assert.equal(missing.body.message, "Requested resource not found");
      const response = await fetch(`${baseUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"name":',
      });
      expectError(
        { status: response.status, body: await response.json() },
        400
      );
    }
  );

  await t.test(
    "unexpected errors return a generic 500 without leaking details",
    async () => {
      const originalFind = User.find;
      User.find = () => Promise.reject(new Error("Private database details"));
      try {
        const result = await request("/users");
        expectError(result, 500);
        assert.equal(
          result.body.message,
          "An error has occurred on the server."
        );
      } finally {
        User.find = originalFind;
      }
      assert.equal((await request("/users")).status, 200);
    }
  );
});
