const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../index');
const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
const directory = path.resolve(__dirname, '../../submission');
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const server = app.listen(5000, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const cookie = path.join(directory, 'demo-cookies.txt');
  async function capture(name, args) {
    const command = curl + ' ' + args.map(arg => /[\s"{}]/.test(arg) ? `'${arg}'` : arg).join(' ');
    const output = await new Promise((resolve, reject) => {
      const child = spawn(curl, args, { cwd: directory });
      let stdout = '', stderr = '';
      child.stdout.on('data', chunk => stdout += chunk);
      child.stderr.on('data', chunk => stderr += chunk);
      child.on('error', reject);
      child.on('close', code => code ? reject(new Error(stderr)) : resolve(stdout));
    });
    await fs.writeFile(path.join(directory, name + '.txt'), `${command}\n\n${output.trim()}\n`);
    console.log(`${name}: saved`);
  }
  const url = 'http://127.0.0.1:5000';
  const get = (name, route) => capture(name, ['-sS', '--fail-with-body', url + route]);
  try {
    await get('getallbooks', '/');
    await get('getbooksbyISBN', '/isbn/1');
    await get('getbooksbyauthor', '/author/Chinua%20Achebe');
    await get('getbooksbytitle', '/title/Things%20Fall%20Apart');
    await get('getbookreview', '/review/1');
    await fs.writeFile(path.join(directory, 'credentials.json'), JSON.stringify({ username: 'bookreader', password: 'Reading123!' }));
    await fs.writeFile(path.join(directory, 'review.json'), JSON.stringify({ review: 'I liked how the story shows the pressure on Okonkwo and his community. The ending was sad, but it made the book stay with me.' }));
    const post = ['-sS', '--fail-with-body', '-H', 'Content-Type: application/json'];
    await capture('register', [...post, '-X', 'POST', '--data-binary', '@credentials.json', url + '/register']);
    await capture('login', [...post, '-X', 'POST', '-c', 'demo-cookies.txt', '--data-binary', '@credentials.json', url + '/customer/login']);
    await capture('reviewadded', [...post, '-X', 'PUT', '-b', 'demo-cookies.txt', '--data-binary', '@review.json', url + '/customer/auth/review/1']);
    await capture('deletereview', ['-sS', '--fail-with-body', '-X', 'DELETE', '-b', 'demo-cookies.txt', url + '/customer/auth/review/1']);
  } finally {
    await fs.rm(cookie, { force: true });
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
