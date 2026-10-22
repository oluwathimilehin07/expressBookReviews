# Book review application

This is my implementation of the IBM Express book review project. The API lets visitors search the catalogue and read reviews. Registered users can log in and add, update or delete their own reviews.

## Run the app

From `final_project`, run:

```
npm ci
npm start
```

The server uses port 5000 by default. Set `PORT` to use another port. `npm test` checks the API, authentication, review ownership and concurrent requests. `npm run evidence` starts a temporary server on port 5000 and saves real cURL commands and responses in `submission`. Stop any existing server on that port first.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | List all books |
| GET | `/isbn/:isbn` | Find one book |
| GET | `/author/:author` | Find books by author |
| GET | `/title/:title` | Find books by title |
| GET | `/review/:isbn` | Read reviews |
| POST | `/register` | Register with a username and password |
| POST | `/customer/login` | Log in and save a session cookie |
| PUT | `/customer/auth/review/:isbn` | Add or update the logged-in user's review |
| DELETE | `/customer/auth/review/:isbn` | Delete the logged-in user's review |

Author and title searches match the full name, ignoring case. The starter catalogue uses keys 1 through 10 as ISBN identifiers; these have been kept unchanged.

Registration and login accept JSON with `username` and `password`. Review requests accept JSON with `review`. The PUT route also accepts the starter lab's `review` query parameter. Save the login cookie and send it with review requests.

The four lookup functions in `final_project/router/general.js` use Axios with async/await or promises. They read `/catalog`, which serves the original book data. Password hashing also runs asynchronously. Each review is stored under the authenticated username, so a username supplied in the request cannot change ownership.

Passwords are salted and hashed. A signed JWT is saved in the server session and checked before review changes. Session and JWT secrets are generated at startup unless `SESSION_SECRET` and `JWT_SECRET` are set.

This is an in-memory course project: accounts, sessions and review changes disappear when the server restarts. A deployed service would need persistent storage and a production session store.

## Submission

`submission` contains the cURL evidence for Tasks 1–9, the general.js URL for Task 10, and GitHub fork evidence for Task 11. The test credentials are demonstration data only.

The assignment names `expressBookReview`, but the available IBM repository is `ibm-developer-skills-network/expressBookReviews`. The completed project is published in https://github.com/oluwathimilehin07/expressBookReviews. The GitHub API confirms the IBM repository as its parent.
