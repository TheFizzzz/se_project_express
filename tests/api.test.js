const assert = require("node:assert/strict");
const { test } = require("node:test");
const { once } = require("node:events");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../app");
const User = require("../models/user");
const ClothingItem = require("../models/clothingItem");
const { JWT_SECRET } = require("../utils/config");

test("Sprint 13 authentication and API integration", async (t) => {
  await mongoose.connect("mongodb://127.0.0.1:27017", {
    dbName: `wtwr_test_${process.pid}_${Date.now()}`,
    serverSelectionTimeoutMS: 3000,
  });
  let server;
  t.after(async () => {
    if (server)
      await new Promise((resolve) => {
        server.close(resolve);
      });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await User.init();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (
    path,
    method = "GET",
    body = undefined,
    token = undefined
  ) => {
    const headers = { "Content-Type": "application/json" };
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const expectError = (response, status) => {
    assert.equal(response.status, status, JSON.stringify(response.body));
    assert.deepEqual(Object.keys(response.body), ["message"]);
    assert.equal(typeof response.body.message, "string");
  };
  const noPassword = (body) =>
    assert.equal(Object.hasOwn(body, "password"), false);
  const ownerData = {
    name: "Coat Owner",
    avatar: "https://example.com/avatar.png",
    email: "owner@example.com",
    password: "Owner-password-123",
  };
  const otherData = {
    ...ownerData,
    name: "Other User",
    email: "other@example.com",
    password: "Other-password-123",
  };
  const itemData = {
    name: "Winter coat",
    weather: "cold",
    imageUrl: "https://example.com/coat.png",
  };
  const missingId = "000000000000000000000000";
  let ownerId;
  let otherId;
  let ownerToken;
  let otherToken;
  let itemId;

  await t.test(
    "public items and CORS work without authentication",
    async () => {
      const response = await request("/items");
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, []);
      assert.equal(
        (await request("/items", "GET", undefined, "bad-token")).status,
        200
      );
      const preflight = await fetch(`${baseUrl}/users/me`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "PATCH",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
      assert.match(
        preflight.headers.get("access-control-allow-headers"),
        /authorization/i
      );
    }
  );

  await t.test("protected routes reject missing authorization", async () => {
    const routes = [
      ["/users/me", "GET"],
      ["/users/me", "PATCH"],
      ["/items", "POST"],
      [`/items/${missingId}`, "DELETE"],
      [`/items/${missingId}/likes`, "PUT"],
      [`/items/${missingId}/likes`, "DELETE"],
    ];
    await Promise.all(
      routes.map(async ([path, method]) => {
        expectError(await request(path, method), 401);
      })
    );
  });

  await t.test(
    "signup hashes passwords and omits them from responses and queries",
    async () => {
      const owner = await request("/signup", "POST", ownerData);
      assert.equal(owner.status, 201);
      noPassword(owner.body);
      ownerId = owner.body._id;
      const stored = await User.findById(ownerId).select("+password");
      assert.notEqual(stored.password, ownerData.password);
      assert.ok(await bcrypt.compare(ownerData.password, stored.password));
      noPassword((await User.findById(ownerId)).toObject());
      const other = await request("/signup", "POST", otherData);
      assert.equal(other.status, 201);
      noPassword(other.body);
      otherId = other.body._id;
    }
  );

  await t.test("signup validates fields before hashing", async () => {
    const invalid = [
      {},
      { ...ownerData, email: "bad-email" },
      { ...ownerData, name: "A" },
      { ...ownerData, name: "A".repeat(31) },
      { ...ownerData, avatar: "not-a-url" },
      ...[undefined, null, "", 12345, {}, "a".repeat(73)].map((password) => ({
        ...ownerData,
        password,
      })),
    ];
    await Promise.all(
      invalid.map(async (body) => {
        expectError(await request("/signup", "POST", body), 400);
      })
    );
  });

  await t.test(
    "unique email index rejects duplicate and concurrent registrations",
    async () => {
      expectError(await request("/signup", "POST", ownerData), 409);
      expectError(
        await request("/signup", "POST", {
          ...ownerData,
          email: " OWNER@EXAMPLE.COM ",
        }),
        409
      );
      const body = { ...ownerData, email: "race@example.com" };
      const responses = await Promise.all([
        request("/signup", "POST", body),
        request("/signup", "POST", body),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
    }
  );

  await t.test(
    "signin returns a one-week JWT with only user ID and time claims",
    async () => {
      const owner = await request("/signin", "POST", {
        email: ownerData.email,
        password: ownerData.password,
      });
      assert.equal(owner.status, 200);
      assert.deepEqual(Object.keys(owner.body), ["token"]);
      ownerToken = owner.body.token;
      const payload = jwt.verify(ownerToken, JWT_SECRET);
      assert.equal(payload._id, ownerId);
      assert.deepEqual(Object.keys(payload).sort(), ["_id", "exp", "iat"]);
      assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
      const other = await request("/signin", "POST", {
        email: otherData.email,
        password: otherData.password,
      });
      assert.equal(other.status, 200);
      otherToken = other.body.token;
    }
  );

  await t.test(
    "incorrect credentials return 401; missing or injected fields return 400",
    async () => {
      const incorrect = [
        { email: ownerData.email, password: "wrong" },
        { email: "missing@example.com", password: ownerData.password },
      ];
      await Promise.all(
        incorrect.map(async (body) => {
          expectError(await request("/signin", "POST", body), 401);
        })
      );
      const malformed = [
        {},
        { email: ownerData.email },
        { password: ownerData.password },
        { email: { $ne: null }, password: ownerData.password },
        { email: ownerData.email, password: { $ne: null } },
      ];
      await Promise.all(
        malformed.map(async (body) => {
          expectError(await request("/signin", "POST", body), 400);
        })
      );
    }
  );

  await t.test(
    "invalid, expired, wrong-signature, and malformed-payload tokens return 401",
    async () => {
      const tokens = [
        "",
        "not-a-token",
        jwt.sign({ _id: ownerId }, "wrong-secret"),
        jwt.sign({ _id: ownerId }, JWT_SECRET, { expiresIn: -1 }),
        jwt.sign({ _id: "invalidid" }, JWT_SECRET),
        jwt.sign({ email: ownerData.email }, JWT_SECRET),
        jwt.sign({ _id: ownerId }, JWT_SECRET, { algorithm: "HS384" }),
      ];
      await Promise.all(
        tokens.map(async (token) => {
          expectError(await request("/users/me", "GET", undefined, token), 401);
        })
      );
      const response = await fetch(`${baseUrl}/users/me`, {
        headers: { Authorization: `Basic ${ownerToken}` },
      });
      assert.equal(response.status, 401);
    }
  );

  await t.test(
    "current user is token-scoped; removed profile routes are unavailable",
    async () => {
      const owner = await request("/users/me", "GET", undefined, ownerToken);
      assert.equal(owner.status, 200);
      assert.equal(owner.body._id, ownerId);
      noPassword(owner.body);
      const other = await request("/users/me", "GET", undefined, otherToken);
      assert.equal(other.body._id, otherId);
      expectError(await request("/users", "GET", undefined, ownerToken), 404);
      expectError(
        await request(`/users/${otherId}`, "GET", undefined, ownerToken),
        404
      );
      expectError(await request("/users", "POST", ownerData, ownerToken), 404);
    }
  );

  await t.test(
    "profile updates validate, allow only name/avatar, and hide passwords",
    async () => {
      const updated = await request(
        "/users/me",
        "PATCH",
        {
          name: "Updated Owner",
          avatar: "https://example.com/new.png",
          email: "hijacked@example.com",
          password: "changed",
          _id: otherId,
        },
        ownerToken
      );
      assert.equal(updated.status, 200);
      assert.equal(updated.body.name, "Updated Owner");
      assert.equal(updated.body.avatar, "https://example.com/new.png");
      assert.equal(updated.body.email, ownerData.email);
      assert.equal(updated.body._id, ownerId);
      noPassword(updated.body);
      assert.equal(
        (
          await request("/signin", "POST", {
            email: ownerData.email,
            password: ownerData.password,
          })
        ).status,
        200
      );
      const partial = await request(
        "/users/me",
        "PATCH",
        { name: "Partial Update" },
        ownerToken
      );
      assert.equal(partial.status, 200);
      assert.equal(partial.body.avatar, "https://example.com/new.png");
      await Promise.all(
        [
          { name: "A" },
          { name: "A".repeat(31) },
          { avatar: "invalid-url" },
          { name: null },
        ].map(async (body) => {
          expectError(
            await request("/users/me", "PATCH", body, ownerToken),
            400
          );
        })
      );
      const ghostToken = jwt.sign({ _id: missingId }, JWT_SECRET);
      expectError(
        await request("/users/me", "GET", undefined, ghostToken),
        404
      );
      expectError(
        await request(
          "/users/me",
          "PATCH",
          { name: "Missing User" },
          ghostToken
        ),
        404
      );
    }
  );

  await t.test(
    "item creation uses authenticated ownership and validates input",
    async () => {
      const item = await request(
        "/items",
        "POST",
        {
          ...itemData,
          owner: otherId,
          likes: [otherId],
          createdAt: "2000-01-01",
        },
        ownerToken
      );
      assert.equal(item.status, 201);
      itemId = item.body._id;
      assert.equal(item.body.owner, ownerId);
      assert.deepEqual(item.body.likes, []);
      assert.ok(Date.now() - Date.parse(item.body.createdAt) < 10000);
      await Promise.all(
        [
          {},
          { ...itemData, weather: "freezing" },
          { ...itemData, imageUrl: "not-a-url" },
          { ...itemData, name: "A" },
        ].map(async (body) => {
          expectError(await request("/items", "POST", body, ownerToken), 400);
        })
      );
    }
  );

  await t.test(
    "likes remain unique and unlikes only remove the current user's like",
    async () => {
      const liked = await Promise.all([
        request(`/items/${itemId}/likes`, "PUT", undefined, ownerToken),
        request(`/items/${itemId}/likes`, "PUT", undefined, ownerToken),
      ]);
      liked.forEach((result) => {
        assert.equal(result.status, 200);
        assert.deepEqual(result.body.likes, [ownerId]);
      });
      const otherLiked = await request(
        `/items/${itemId}/likes`,
        "PUT",
        undefined,
        otherToken
      );
      assert.deepEqual(otherLiked.body.likes.sort(), [ownerId, otherId].sort());
      const unliked = await request(
        `/items/${itemId}/likes`,
        "DELETE",
        undefined,
        ownerToken
      );
      assert.equal(unliked.status, 200);
      assert.deepEqual(unliked.body.likes, [otherId]);
      assert.deepEqual(
        (
          await request(
            `/items/${itemId}/likes`,
            "DELETE",
            undefined,
            ownerToken
          )
        ).body.likes,
        [otherId]
      );
    }
  );

  await t.test("only an item's owner can delete it", async () => {
    expectError(
      await request(`/items/${itemId}`, "DELETE", undefined, otherToken),
      403
    );
    assert.ok(await ClothingItem.findById(itemId));
    const deleted = await request(
      `/items/${itemId}`,
      "DELETE",
      undefined,
      ownerToken
    );
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body._id, itemId);
    assert.equal(await ClothingItem.findById(itemId), null);
    expectError(
      await request(`/items/${itemId}`, "DELETE", undefined, ownerToken),
      404
    );
  });

  await t.test(
    "item ID validation and missing resources return 400/404",
    async () => {
      const routes = [
        ["", "DELETE"],
        ["/likes", "PUT"],
        ["/likes", "DELETE"],
      ];
      await Promise.all(
        routes.map(async ([suffix, method]) => {
          expectError(
            await request(
              `/items/invalidid${suffix}`,
              method,
              undefined,
              ownerToken
            ),
            400
          );
          expectError(
            await request(
              `/items/${missingId}${suffix}`,
              method,
              undefined,
              ownerToken
            ),
            404
          );
        })
      );
      const unknown = await request("/unknown", "GET", undefined, ownerToken);
      expectError(unknown, 404);
      assert.equal(unknown.body.message, "Requested resource not found");
      const response = await fetch(`${baseUrl}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"name":',
      });
      assert.equal(response.status, 400);
    }
  );

  await t.test(
    "unexpected errors return a generic 500 without private details",
    async () => {
      const mock = t.mock.method(ClothingItem, "find", () =>
        Promise.reject(new Error("Private database details"))
      );
      try {
        const result = await request("/items");
        expectError(result, 500);
        assert.equal(
          result.body.message,
          "An error has occurred on the server."
        );
      } finally {
        mock.mock.restore();
      }
      assert.equal((await request("/items")).status, 200);
    }
  );
});
