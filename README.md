# WTWR (What to Wear?): Back End

An Express API for the WTWR clothing application. Users can create profiles, add
clothing for hot, warm, or cold weather, browse items, delete items, and like or
unlike them. MongoDB stores profiles and clothing items between server restarts.

Built with Node.js, Express 4, Mongoose 8, and MongoDB. Mongoose schemas validate
required fields, name lengths, and weather categories; validator checks image
URLs. Atomic MongoDB updates prevent duplicate likes. Routes, controllers, and
models are organized separately, with shared JSON error handling. ESLint uses the
Airbnb base configuration, Prettier formats code, and nodemon enables hot reload.

## Local setup

Use Node.js 22 or newer and a running MongoDB installation.

```bash
npm ci
npm run start
```

The API defaults to `http://localhost:3001` and connects to
`mongodb://127.0.0.1:27017/wtwr_db`. Override these settings with environment
variables when launching the server:

```bash
PORT=3002 MONGODB_URI=mongodb://127.0.0.1:27017/wtwr_db npm run start
```

If MongoDB is installed but no local service is running, start a project-local
database from this directory in another terminal:

```bash
mkdir -p .mongodb logs
mongod --dbpath .mongodb --bind_ip 127.0.0.1 --port 27017 --logpath logs/mongodb.log
```

Database files and logs are ignored by Git. The server begins listening after
the database connection succeeds.

## Commands

| Command          | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `npm run start`  | Start the server on port 3001 by default        |
| `npm run dev`    | Start with automatic restarts on code changes   |
| `npm run lint`   | Check code with ESLint                          |
| `npm run format` | Format project files with Prettier              |
| `npm test`       | Run API integration tests against local MongoDB |

Install the **EditorConfig for VS Code** extension if using VS Code or Cursor,
then restart the editor to apply the supplied `.editorconfig` settings.

## API

Send request bodies as JSON with `Content-Type: application/json`.
Successful list requests return arrays; individual requests return documents.
Creation returns `201`; other successful operations return `200`.

| Method | Route                  | Description                                           |
| ------ | ---------------------- | ----------------------------------------------------- |
| GET    | `/users`               | List users                                            |
| GET    | `/users/:userId`       | Get a user                                            |
| POST   | `/users`               | Create a user with `name` and `avatar`                |
| GET    | `/items`               | List clothing items                                   |
| POST   | `/items`               | Create an item with `name`, `weather`, and `imageUrl` |
| DELETE | `/items/:itemId`       | Delete an item                                        |
| PUT    | `/items/:itemId/likes` | Like an item once per user                            |
| DELETE | `/items/:itemId/likes` | Remove the user's like                                |

Names must contain 2–30 characters. Weather must be `hot`, `warm`, or `cold`.
Image URLs must be valid HTTP or HTTPS URLs. Item ownership comes from the
temporary authorization middleware. New items have no likes and use the current
date for `createdAt`.

Example user creation:

```bash
curl -X POST http://localhost:3001/users -H 'Content-Type: application/json' -d '{"name":"Test User","avatar":"https://example.com/avatar.png"}'
```

Example clothing item creation:

```bash
curl -X POST http://localhost:3001/items -H 'Content-Type: application/json' -d '{"name":"Winter coat","weather":"cold","imageUrl":"https://example.com/coat.png"}'
```

Errors return a JSON object containing only `message`:

- `400`: Invalid input, malformed JSON, or invalid ObjectId.
- `404`: Missing user/item or unknown route.
- `500`: Unexpected failure, with `An error has occurred on the server.`

Unknown routes return `{"message":"Requested resource not found"}`.

## Temporary authorization (Sprint 12)

Every request uses the test user ID `6aabdca4b4ec4d6640a397d8` in `app.js`.
This user was created through `POST /users` in the local `wtwr_db` database.
On a fresh database, create your own test user using the example request above
and replace the ID in `app.js` with the returned `_id`.

Real login, passwords, tokens, and ownership-based access restrictions are not
implemented in this sprint. The middleware is a temporary development solution.

## Verification

`npm test` checks user and item creation, validation, retrieval, deletion,
duplicate likes, unlikes, invalid IDs, missing records, malformed JSON, and
unexpected server errors. It creates a uniquely named `wtwr_test_*` database on
local MongoDB and removes it afterward, leaving `wtwr_db` untouched.

The original `.github` test workflow is preserved. `sprint.txt` is set to
`12-ft` to match the provided full-time Sprint 12 criteria. GitHub runs the
course tests when changes are pushed to `main`.

Repository: [TheFizzzz/se_project_express](https://github.com/TheFizzzz/se_project_express)
