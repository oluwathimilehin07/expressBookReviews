const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const { registerUser } = require('./auth_users');
const public_users = express.Router();

// Task 10: all four lookups use Axios with async/await or promises.
async function getAllBooks(baseURL) {
  const response = await axios.get(`${baseURL}/catalog`, { proxy: false, timeout: 5000 });
  return response.data;
}
async function getBookByISBN(baseURL, isbn) {
  const response = await axios.get(`${baseURL}/catalog`, { proxy: false, timeout: 5000 });
  const catalogue = response.data;
  return Object.hasOwn(catalogue, isbn) ? catalogue[isbn] : null;
}
async function getBooksByAuthor(baseURL, author) {
  const response = await axios.get(`${baseURL}/catalog`, { proxy: false, timeout: 5000 });
  return Object.fromEntries(Object.entries(response.data).filter(([, book]) =>
    book.author.toLowerCase() === author.toLowerCase()));
}
async function getBooksByTitle(baseURL, title) {
  const response = await axios.get(`${baseURL}/catalog`, { proxy: false, timeout: 5000 });
  return Object.fromEntries(Object.entries(response.data).filter(([, book]) =>
    book.title.toLowerCase() === title.toLowerCase()));
}
function lookup(method, parameter) {
  return async (req, res, next) => {
    try {
      const baseURL = `http://127.0.0.1:${req.socket.localPort}`;
      const result = await method(baseURL, req.params[parameter]);
      if (!result || Object.keys(result).length === 0) {
        return res.status(404).json({ message: 'No matching books found.' });
      }
      res.json(result);
    } catch (err) { next(err); }
  };
}
public_users.post('/register', async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(result.status).json({ message: result.message });
  } catch (err) { next(err); }
});
public_users.get('/', lookup(getAllBooks));
public_users.get('/isbn/:isbn', lookup(getBookByISBN, 'isbn'));
public_users.get('/author/:author', lookup(getBooksByAuthor, 'author'));
public_users.get('/title/:title', lookup(getBooksByTitle, 'title'));
public_users.get('/review/:isbn', (req, res) => {
  if (!Object.hasOwn(books, req.params.isbn)) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  res.json(books[req.params.isbn].reviews);
});
module.exports = { general: public_users, getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };
