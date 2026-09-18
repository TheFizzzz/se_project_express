# WTWR (What to Wear?): Back End

The WTWR API stores weather-based clothing suggestions and user profiles.
Sprint 13 adds email/password signup, JWT login, private profile access, profile
updates, and ownership checks. Anyone can browse clothing; signed-in users can
create items and like or unlike them. Only the owner can delete an item.

## Technologies and techniques

- Node.js, Express 4, MongoDB, and Mongoose 8.
- Required schema fields, weather enums, and validator email/URL validation.
- bcryptjs password hashing with a cost factor of 10; password hashes are hidden
  from queries and signup responses.
- jsonwebtoken tokens with a seven-day lifetime and Bearer authorization.
- Atomic likes and unique email indexes, including duplicate-email handling.
- CORS, centralized JSON error responses, and separated routes/controllers/models.
- Airbnb ESLint, Prettier, nodemon, and Node's built-in integration test runner.

## Setup

Use Node.js 22 or newer and a running MongoDB server.

```bash
npm ci
npm run dev
```

The server defaults to `http://localhost:3001` and
`mongodb://127.0.0.1:27017/wtwr_db`. It starts listening after MongoDB connects and
the unique email index is ready.

If no MongoDB service is running, start the project-local database in another
terminal from the project directory:

```bash
mkdir -p .mongodb logs
mongod --dbpath .mongodb --bind_ip 127.0.0.1 --port 27017 --logpath logs/mongodb.log
```

These database files and logs are excluded from Git. Do not start another MongoDB
instance if port 27017 is already in use. Likewise, run only one API server on
port 3001.

Configuration is read from environment variables:

| Variable      | Default / use                                                                       |
| ------------- | ----------------------------------------------------------------------------------- |
| `PORT`        | `3001`                                                                              |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/wtwr_db`                                                 |
| `JWT_SECRET`  | Development-only fallback in `utils/config.js`; set a private secret for deployment |
| `NODE_ENV`    | With `production`, startup requires an explicit `JWT_SECRET`                        |

Set environment variables in the shell before starting the server. A `.env` file
is not loaded automatically. Changing `JWT_SECRET` invalidates existing tokens.

## Commands

| Command                  | Purpose                               |
| ------------------------ | ------------------------------------- |
| `npm run start`          | Start the API                         |
| `npm run dev`            | Start with hot reload                 |
| `npm run lint`           | Run ESLint                            |
| `npx prettier --check .` | Check formatting                      |
| `npm run format`         | Format project files                  |
| `npm test`               | Run isolated MongoDB-backed API tests |

## API

Use JSON request bodies. Creation returns `201`; other successful API requests
return `200`. Errors contain only a `message` field.

| Method | Route                  | Access        | Body / action                                     |
| ------ | ---------------------- | ------------- | ------------------------------------------------- |
| POST   | `/signup`              | Public        | `name`, `avatar`, `email`, `password`             |
| POST   | `/signin`              | Public        | `email`, `password`; returns `{ "token": "..." }` |
| GET    | `/items`               | Public        | Returns an array of clothing items                |
| GET    | `/users/me`            | Bearer token  | Returns the signed-in user's profile              |
| PATCH  | `/users/me`            | Bearer token  | Updates only `name` and/or `avatar`               |
| POST   | `/items`               | Bearer token  | `name`, `weather`, `imageUrl`                     |
| DELETE | `/items/:itemId`       | Owner's token | Deletes the item                                  |
| PUT    | `/items/:itemId/likes` | Bearer token  | Adds the current user's like once                 |
| DELETE | `/items/:itemId/likes` | Bearer token  | Removes the current user's like                   |

Names must be 2–30 characters. Weather is `hot`, `warm`, or `cold`. Image URLs
must use HTTP or HTTPS. Emails are trimmed and lowercased before storage and
login. Passwords must be nonempty strings of at most 72 UTF-8 bytes, avoiding
bcrypt's silent truncation of longer inputs.

The old `/users` listing/creation and `/users/:userId` lookup routes are removed.
Item ownership comes from the verified token, never the submitted request body.

## Testing manually in Postman

Leave `npm run dev` running. Enter URLs without trailing spaces or line breaks.

1. Send **POST** `http://localhost:3001/signup`, with **Body → raw → JSON**:

   ```json
   {
     "name": "Test User",
     "avatar": "https://example.com/avatar.png",
     "email": "tester@example.com",
     "password": "Example-password-123"
   }
   ```

   Expect `201` and a user object with no password or hash.

2. Send **POST** `http://localhost:3001/signin`:

   ```json
   {
     "email": "tester@example.com",
     "password": "Example-password-123"
   }
   ```

   Expect `200`. Copy the token string from the response, without quotation marks.

3. For protected requests, select **Authorization → Bearer Token**, and paste the
   token in the Token field. Postman adds the `Authorization: Bearer ...` header.
   Send **GET** `http://localhost:3001/users/me` with **Body → none**.

4. Send **PATCH** to the same URL with a JSON body such as
   `{ "name": "Updated User", "avatar": "https://example.com/new.png" }`.
   Expect the updated profile, without its password.

5. Create an item using **POST** `http://localhost:3001/items` with your token:

   ```json
   {
     "name": "Winter coat",
     "weather": "cold",
     "imageUrl": "https://example.com/coat.png"
   }
   ```

   Save its `_id`. Use it for likes and deletion as listed in the API table.

See [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) for negative tests,
GitHub checks, and the pitch-video demonstration outline.

[Pitch Video:] (https://drive.google.com/file/d/1fu0eoJvMIlSFtOjyTYmm1r5R_WBX6f3s/view?usp=sharing)

## Errors

| Status | Meaning                                                                |
| ------ | ---------------------------------------------------------------------- |
| `400`  | Invalid input, ObjectId, or malformed JSON                             |
| `401`  | Incorrect credentials, missing authorization, or invalid/expired token |
| `403`  | Attempt to delete another user's item                                  |
| `404`  | Missing user/item or unknown route with valid authorization            |
| `409`  | Email is already registered                                            |
| `500`  | Unexpected failure: `An error has occurred on the server.`             |

Only signup, signin, and item listing are public. Unknown protected paths without
a valid token are rejected by authorization first.

## Database transition and verification

Sprint 12 users lack credentials. Before upgrading an existing database,
archive old test collections or migrate their accounts so the unique email index
can be created. Do not drop data you need. Archived collections are separate from
the active `users` and `clothingitems` collections; create new accounts via signup.

`npm test` creates and removes a uniquely named `wtwr_test_*` database, leaving
`wtwr_db` and its archives untouched. It covers password hashing/privacy, login,
JWT lifetime, invalid tokens, unique emails, profile validation, ownership,
likes, CORS, and error responses.

The original `.github` workflow is preserved. `sprint.txt` is now `13`, enabling
the Sprint 13 course tests on pushes to `main`.

Repository: [TheFizzzz/se_project_express](https://github.com/TheFizzzz/se_project_express)
