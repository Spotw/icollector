const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/entries' && request.method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT id, mo_ta, loai_thong_tin, noi_dung, created_at FROM entries ORDER BY id ASC')
        .all();
      return json(results);
    }

    if (pathname === '/api/entries' && request.method === 'POST') {
      let b;
      try { b = await request.json(); } catch { return json({ error: 'JSON không hợp lệ' }, 400); }
      const mo_ta = String(b.mo_ta || '').trim();
      const loai = String(b.loai_thong_tin || '').trim();
      const noi_dung = String(b.noi_dung || '').trim();
      if (!mo_ta || !loai) return json({ error: 'Loại thông tin và Mô tả là bắt buộc' }, 400);
      if (mo_ta.length > 300 || loai.length > 100 || noi_dung.length > 10000) {
        return json({ error: 'Dữ liệu quá dài' }, 400);
      }
      const r = await env.DB
        .prepare('INSERT INTO entries (mo_ta, loai_thong_tin, noi_dung) VALUES (?, ?, ?)')
        .bind(mo_ta, loai, noi_dung)
        .run();
      return json({ ok: true, id: r.meta.last_row_id }, 201);
    }

    const m = pathname.match(/^\/api\/entries\/(\d+)$/);
    if (m && request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM entries WHERE id = ?').bind(Number(m[1])).run();
      return json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  },
};
