const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const books = require('./router/booksdb');
const app = express();
app.locals.jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
app.use(express.json());
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 3600000 }
}));
// The Axios lookup methods read the catalogue through this endpoint.
app.get('/catalog', (req, res) => res.json(books));
app.use('/customer', require('./router/auth_users').authenticated);
app.use('/', require('./router/general').general);
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }
  console.error(err.message);
  res.status(500).json({ message: 'Unable to complete the request.' });
});
if (require.main === module) {
  app.listen(process.env.PORT || 5000, () => console.log('Book review server is running.'));
}
module.exports = app;
