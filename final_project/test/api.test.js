const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');

test('catalogue, authentication, ownership and concurrent requests', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, cookie) {
    const response = await fetch(base + path, { method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, data: await response.json(),
      cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  assert.equal(Object.keys((await request('/')).data).length, 10);
  assert.equal((await request('/isbn/1')).data.author, 'Chinua Achebe');
  assert.equal(Object.keys((await request('/author/Unknown')).data).length, 4);
  assert.equal((await request('/title/Things%20Fall%20Apart')).data['1'].author, 'Chinua Achebe');
  assert.deepEqual((await request('/review/1')).data, {});
  assert.equal((await request('/isbn/999')).status, 404);
  assert.equal((await request('/isbn/__proto__')).status, 404);
  assert.equal((await request('/customer/auth/review/1', 'PUT', { review: 'Test' })).status, 401);
  assert.equal((await request('/register', 'POST', { username: 'a', password: 'x' })).status, 400);
  const credentials = { username: 'reader_one', password: 'Reading123!' };
  const registrations = await Promise.all([request('/register', 'POST', credentials), request('/register', 'POST', credentials)]);
  assert.deepEqual(registrations.map(r => r.status).sort(), [201, 409]);
  assert.equal((await request('/customer/login', 'POST', { ...credentials, password: 'wrong' })).status, 401);
  const first = await request('/customer/login', 'POST', credentials);
  assert.equal(first.status, 200);
  assert.ok(first.cookie);
  await request('/register', 'POST', { username: 'reader_two', password: 'Reading456!' });
  const second = await request('/customer/login', 'POST', { username: 'reader_two', password: 'Reading456!' });
  assert.equal((await request('/customer/auth/review/1', 'PUT', { review: ' ' }, first.cookie)).status, 400);
  const added = await request('/customer/auth/review/1', 'PUT', { review: 'A thoughtful book.' }, first.cookie);
  assert.equal(added.data.reviews.reader_one, 'A thoughtful book.');
  assert.equal((await request('/customer/auth/review/1', 'DELETE', null, second.cookie)).status, 404);
  await request('/customer/auth/review/1', 'PUT', { review: 'My second reading.', username: 'reader_one' }, second.cookie);
  const updated = await request('/customer/auth/review/1', 'PUT', { review: 'Updated thoughts.' }, first.cookie);
  assert.equal(updated.data.reviews.reader_one, 'Updated thoughts.');
  assert.equal(updated.data.reviews.reader_two, 'My second reading.');
  const deleted = await request('/customer/auth/review/1', 'DELETE', null, first.cookie);
  assert.equal(deleted.data.message, 'Review for ISBN 1 deleted');
  assert.deepEqual((await request('/review/1')).data, { reader_two: 'My second reading.' });
  const { getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle } = require('../router/general');
  const lookups = await Promise.all([getAllBooks(base), getBookByISBN(base, '1'), getBooksByAuthor(base, 'Unknown'), getBooksByTitle(base, 'Things Fall Apart')]);
  assert.equal(Object.keys(lookups[0]).length, 10);
  assert.equal(lookups[1].title, 'Things Fall Apart');
  assert.equal(Object.keys(lookups[2]).length, 4);
  assert.equal(lookups[3]['1'].author, 'Chinua Achebe');
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => request('/')));
  assert.ok(concurrent.every(result => result.status === 200));
  await request('/customer/auth/review/1', 'DELETE', null, second.cookie);
});
