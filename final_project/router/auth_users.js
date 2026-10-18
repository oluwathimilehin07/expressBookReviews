const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const books = require('./booksdb');
const regd_users = express.Router();
const users = new Map();
const pending = new Set();
const isValid = username => users.has(username);
async function registerUser({ username, password } = {}) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{3,40}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { status: 400, message: 'Use a username of 3-40 letters, numbers, underscores or hyphens and a password of 8-128 characters.' };
  }
  if (isValid(username) || pending.has(username)) {
    return { status: 409, message: 'That username is already registered.' };
  }
  pending.add(username);
  try {
    const salt = randomBytes(16).toString('hex');
    const hash = await deriveKey(password, salt, 64);
    users.set(username, { salt, hash });
    return { status: 201, message: 'User registered successfully.' };
  } finally { pending.delete(username); }
}
async function authenticatedUser(username, password) {
  const user = users.get(username);
  if (!user || typeof password !== 'string' || password.length > 128) return false;
  const hash = await deriveKey(password, user.salt, 64);
  return timingSafeEqual(hash, user.hash);
}
regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!await authenticatedUser(username, password)) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.authorization = jwt.sign({ username }, req.app.locals.jwtSecret, { expiresIn: '1h' });
      req.session.save(err => {
        if (err) return next(err);
        res.json({ message: 'Login successful.' });
      });
    });
  } catch (err) { next(err); }
});
regd_users.use('/auth', (req, res, next) => {
  try {
    req.user = jwt.verify(req.session.authorization, req.app.locals.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    res.status(401).json({ message: 'Please log in to manage reviews.' });
  }
});
regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) && books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 2000) {
    return res.status(400).json({ message: 'Enter a review between 1 and 2000 characters.' });
  }
  const exists = Object.hasOwn(book.reviews, req.user.username);
  Object.defineProperty(book.reviews, req.user.username, {
    value: review.trim(), writable: true, enumerable: true, configurable: true
  });
  res.json({ message: exists ? 'Review updated successfully.' : 'Review added successfully.', reviews: book.reviews });
});
regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = Object.hasOwn(books, req.params.isbn) && books[req.params.isbn];
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  if (!Object.hasOwn(book.reviews, req.user.username)) {
    return res.status(404).json({ message: 'You have no review for this book.' });
  }
  delete book.reviews[req.user.username];
  res.json({ message: 'Review deleted successfully.', reviews: book.reviews });
});
module.exports = { authenticated: regd_users, isValid, authenticatedUser, users, registerUser };
