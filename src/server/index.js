import { Hono } from 'hono';

const app = new Hono();

const limits = {
  mo_ta: 300,
  loai_thong_tin: 100,
  noi_dung: 10000,
};

app.get('/api/entries', async (c) => {
  const { results } = await c.env.DB
    .prepare(
      'SELECT id, mo_ta, loai_thong_tin, noi_dung, created_at FROM entries ORDER BY id DESC',
    )
    .all();

  return c.json(results);
});

app.post('/api/entries', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Nội dung gửi lên không phải JSON hợp lệ.' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, 400);
  }

  const entry = {};
  for (const field of Object.keys(limits)) {
    const value = body[field] ?? '';
    if (typeof value !== 'string') {
      return c.json({ error: 'Các trường thông tin cần có định dạng văn bản.' }, 400);
    }
    entry[field] = value.trim();
    if (entry[field].length > limits[field]) {
      return c.json({ error: `Trường "${field}" vượt quá giới hạn ký tự.` }, 400);
    }
  }

  if (!entry.mo_ta || !entry.loai_thong_tin) {
    return c.json({ error: 'Vui lòng nhập mô tả và loại thông tin.' }, 400);
  }

  const result = await c.env.DB
    .prepare(
      'INSERT INTO entries (mo_ta, loai_thong_tin, noi_dung) VALUES (?, ?, ?)',
    )
    .bind(entry.mo_ta, entry.loai_thong_tin, entry.noi_dung)
    .run();

  return c.json({ ok: true, id: result.meta.last_row_id }, 201);
});

app.delete('/api/entries/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id < 1) {
    return c.json({ error: 'Mã thông tin không hợp lệ.' }, 400);
  }

  const result = await c.env.DB
    .prepare('DELETE FROM entries WHERE id = ?')
    .bind(id)
    .run();

  if (!result.meta.changes) {
    return c.json({ error: 'Thông tin này không còn tồn tại.' }, 404);
  }

  return c.json({ ok: true });
});

app.all('/api/*', (c) => c.json({ error: 'Không tìm thấy đường dẫn API.' }, 404));

app.onError((error, c) => {
  console.error('iCollector request failed:', error);
  return c.json({ error: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.' }, 500);
});

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
