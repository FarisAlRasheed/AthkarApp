#!/usr/bin/env node
// Local-only content editor. Serves the editor page and reads/writes content/ on this machine.
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, validateData } from '../validate-content.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, '..', '..', 'content');
const PORT = Number(process.env.PORT ?? 4321);
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/editor.js': ['editor.js', 'text/javascript; charset=utf-8'],
  '/editor.css': ['editor.css', 'text/css; charset=utf-8'],
};

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const readBody = (req, limit) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const writeJson = (p, data) => writeFileSync(join(CONTENT, p), `${JSON.stringify(data, null, 2)}\n`);

function saveContent(next) {
  // Recordings of deleted athkar are removed only once the save is accepted.
  const orphans = [];
  for (const [rid, r] of Object.entries(next.reciters)) {
    for (const id of r.recorded) if (!next.athkar[id]) orphans.push(join(rid, `${id}.m4a`));
    r.recorded = r.recorded.filter((id) => next.athkar[id]);
  }
  const { errors, warnings } = validateData(next, join(CONTENT, 'audio'), new Set(orphans));
  if (errors.length) return { status: 400, body: { errors, warnings } };
  for (const f of orphans) rmSync(join(CONTENT, 'audio', f), { force: true });

  const current = loadContent(CONTENT);
  next.manifest.contentVersion = current.manifest.contentVersion + 1;
  writeJson('manifest.json', next.manifest);
  writeJson('athkar.json', next.athkar);
  writeJson('reciters.json', next.reciters);
  for (const [bookId, book] of Object.entries(next.books)) writeJson(join('books', `${bookId}.json`), book);
  for (const f of readdirSync(join(CONTENT, 'books'))) {
    if (f.endsWith('.json') && !(f.slice(0, -5) in next.books)) rmSync(join(CONTENT, 'books', f));
  }
  return { status: 200, body: { contentVersion: next.manifest.contentVersion, warnings } };
}

function setRecorded(reciterId, thikrId, recorded) {
  const reciters = JSON.parse(readFileSync(join(CONTENT, 'reciters.json'), 'utf8'));
  const list = new Set(reciters[reciterId].recorded);
  if (recorded) list.add(thikrId); else list.delete(thikrId);
  reciters[reciterId].recorded = [...list];
  writeJson('reciters.json', reciters);
  return reciters;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && STATIC[url.pathname]) {
      const [file, type] = STATIC[url.pathname];
      return send(res, 200, readFileSync(join(HERE, file)), type);
    }

    if (url.pathname === '/api/content') {
      if (req.method === 'GET') return send(res, 200, loadContent(CONTENT));
      if (req.method === 'PUT') {
        const next = JSON.parse((await readBody(req, 5 * 1024 * 1024)).toString('utf8'));
        const { status, body } = saveContent(next);
        return send(res, status, body);
      }
    }

    // /audio/<reciter>/<thiker>.m4a (play) and /api/audio/<reciter>/<thiker> (upload/delete)
    const audio = url.pathname.match(/^\/(api\/)?audio\/([^/]+)\/([^/]+?)(\.m4a)?$/);
    if (audio) {
      const [, api, reciterId, thikrId] = audio;
      if (!ID_PATTERN.test(reciterId) || !ID_PATTERN.test(thikrId)) return send(res, 400, { error: 'bad id' });
      const reciters = JSON.parse(readFileSync(join(CONTENT, 'reciters.json'), 'utf8'));
      if (!reciters[reciterId]) return send(res, 404, { error: 'unknown reciter' });
      const file = join(CONTENT, 'audio', reciterId, `${thikrId}.m4a`);

      if (!api && req.method === 'GET') {
        return existsSync(file) ? send(res, 200, readFileSync(file), 'audio/mp4') : send(res, 404, { error: 'no audio' });
      }
      if (api && req.method === 'PUT') {
        const data = await readBody(req, MAX_AUDIO_BYTES);
        // An .m4a file is an MP4 container: bytes 4–8 are "ftyp".
        if (data.subarray(4, 8).toString('latin1') !== 'ftyp') return send(res, 400, { error: 'الملف ليس بصيغة m4a' });
        writeFileSync(file, data);
        return send(res, 200, { reciters: setRecorded(reciterId, thikrId, true) });
      }
      if (api && req.method === 'DELETE') {
        if (existsSync(file)) unlinkSync(file);
        return send(res, 200, { reciters: setRecorded(reciterId, thikrId, false) });
      }
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

if (!existsSync(CONTENT)) {
  console.error('content/ not found — run `npm run content:convert` first.');
  process.exit(1);
}
server.listen(PORT, '127.0.0.1', () => console.log(`محرر الأذكار → http://localhost:${PORT}`));
