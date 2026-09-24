# Sprint 15 submission checklist

## Automated checks

Run from the project directory with MongoDB running:

```bash
npm run lint
npx prettier --check .
npm test
npm run test:recovery
```

- [x] ESLint exits without errors or warnings.
- [x] Prettier reports that all matched files use its code style.
- [x] All 16 reported integration tests pass.
- [x] PM2 restarts the API after a request to `/crash-test`.
- [x] Official course configuration checker passes locally.
- [x] Official Sprint 13 Postman collection passes locally: 102 assertions, 41 requests.

Verified on September 21, 2026. Rerun these checks after further code changes;
the local course run does not replace checking GitHub Actions after pushing.

## Postman checks

Start `npm run dev`. Use **Body → raw → JSON** for JSON requests and
**Authorization → Bearer Token** for protected routes.

- [ ] Signup returns `201`, with no password or hash.
- [ ] Reusing the email returns `409`.
- [ ] Invalid email, missing fields, and invalid name/avatar return `400`.
- [ ] Signin returns a token; incorrect credentials return `401`.
- [ ] GET `/items` works without a token.
- [ ] GET `/users/me` without a token returns `401`.
- [ ] GET `/users/me` with a valid token returns only that user's profile.
- [ ] PATCH `/users/me` returns updated name/avatar without a password.
- [ ] Invalid profile updates return `400`; email/password changes are ignored.
- [ ] POST `/items` without a token returns `401`.
- [ ] POST `/items` with a token uses that user's ID as owner.
- [ ] Liking twice keeps one like; unliking removes only your own like.
- [ ] Create a second account and use its token: deleting the first account's
      item returns `403`, and the item still exists.
- [ ] The original owner's token can delete the item; repeating returns `404`.
- [ ] Invalid item IDs return `400` with a valid token.
- [ ] Malformed or expired tokens return `401`.
- [ ] An unknown URL with a valid token returns `404` and
      `Requested resource not found`.
- [ ] Restarting the API preserves saved users/items and allows signin again.

## Submission

- [x] Confirm `sprint.txt` contains `13`.
- [x] Replace the deployed-domain TODO in `README.md` with the public domain.
- [x] Add the frontend repository and pitch-video links to `README.md`.
- [x] Confirm the frontend GitHub repository is public.
- [x] Confirm `/crash-test` crashes the deployed process and PM2 restores it.
- [x] Confirm both public subdomains, nginx redirects, and trusted HTTPS work.
- [x] Confirm the server's `.env` contains secrets and is not tracked by Git.
- [x] Review `git diff` and `git status`; database files, logs, and secrets must
      remain ignored.
- [ ] Commit and push the reviewed changes to `main`.
- [ ] Confirm the latest GitHub Actions course workflow passes. If a course test
      appears incorrect, share the failed case and repository with your coach.
- [ ] Record and submit the required pitch video, following the course's full
      video instructions (duration and delivery requirements were not supplied).
- [ ] Submit the repository and video links.

## Suggested pitch demonstration

1. Explain what WTWR does and what authentication adds in Sprint 13.
2. Show signup and signin, then the current user's protected profile.
3. Show a profile update and creating a clothing item.
4. Demonstrate `401` without a token and `403` when another user tries deletion.
5. Explain password hashing, hidden password fields, JWT verification and expiry,
   unique emails, and the ownership check in the code.
6. Show the passing local checks and GitHub Actions result.

Use demonstration credentials and avoid displaying production secrets or tokens.
