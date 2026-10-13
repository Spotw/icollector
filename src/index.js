const HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thông tin thu thập trong ngày</title>
<style>
  :root { --bg:#f4f6fa; --card:#fff; --text:#1f2937; --muted:#6b7280; --primary:#2563eb; --danger:#dc2626; --line:#e5e7eb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#111827; --card:#1f2937; --text:#f3f4f6; --muted:#9ca3af; --primary:#3b82f6; --danger:#f87171; --line:#374151; }
  }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:var(--bg); color:var(--text); }
  .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 1.5rem; margin: 0 0 16px; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:20px; margin-bottom:24px; }
  label { display:block; font-size:.85rem; color:var(--muted); margin-bottom:4px; }
  input, textarea { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:transparent; color:var(--text); font:inherit; }
  input:focus, textarea:focus { outline:2px solid var(--primary); border-color:transparent; }
  .row { display:grid; grid-template-columns: 1fr 2fr; gap:12px; margin-bottom:12px; }
  @media (max-width:600px) { .row { grid-template-columns: 1fr; } }
  .field { margin-bottom:12px; }
  .row .field { margin-bottom:0; }
  button { cursor:pointer; border:0; border-radius:8px; padding:10px 18px; font:inherit; font-weight:600; background:var(--primary); color:#fff; }
  button:disabled { opacity:.6; cursor:wait; }
  button.del { background:transparent; color:var(--danger); padding:4px 8px; font-weight:500; }
  .msg { margin-left:12px; font-size:.9rem; color:var(--muted); }
  .scroll { overflow-x:auto; }
  table { width:100%; border-collapse:collapse; min-width:560px; }
  th, td { text-align:left; padding:10px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  td.stt { width:48px; color:var(--muted); }
  td.nd { white-space:pre-wrap; word-break:break-word; }
  .empty { color:var(--muted); text-align:center; padding:24px 0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Thông tin thu thập trong ngày</h1>

  <div class="card">
    <h2>Nhập thông tin</h2>
    <div class="row">
      <div class="field">
        <label for="loai">Loại thông tin</label>
        <input id="loai" maxlength="100" placeholder="VD: Công việc, Ý tưởng...">
      </div>
      <div class="field">
        <label for="mota">Mô tả</label>
        <input id="mota" maxlength="300" placeholder="Mô tả ngắn gọn">
      </div>
    </div>
    <div class="field">
      <label for="noidung">Nội dung thông tin</label>
      <textarea id="noidung" rows="4" placeholder="Nội dung chi tiết..."></textarea>
    </div>
    <button id="btnSave">Lưu</button><span class="msg" id="msg"></span>
  </div>

  <div class="card">
    <h2>Danh sách đã nhập</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>STT</th><th>Mô tả</th><th>Loại thông tin</th><th>Nội dung thông tin</th><th></th></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const $ = (id) => document.getElementById(id);
const tbody = $('tbody'), msg = $('msg'), btn = $('btnSave');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function load() {
  try {
    const res = await fetch('/api/entries');
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Chưa có dữ liệu</td></tr>';
      return;
    }
    tbody.innerHTML = data.map((r, i) =>
      '<tr><td class="stt">' + (i + 1) + '</td>' +
      '<td>' + esc(r.mo_ta) + '</td>' +
      '<td>' + esc(r.loai_thong_tin) + '</td>' +
      '<td class="nd">' + esc(r.noi_dung) + '</td>' +
      '<td><button class="del" data-id="' + r.id + '">Xóa</button></td></tr>'
    ).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Không tải được dữ liệu</td></tr>';
  }
}

btn.addEventListener('click', async () => {
  const body = {
    loai_thong_tin: $('loai').value.trim(),
    mo_ta: $('mota').value.trim(),
    noi_dung: $('noidung').value.trim(),
  };
  if (!body.loai_thong_tin || !body.mo_ta || !body.noi_dung) {
    msg.textContent = 'Vui lòng nhập đủ 3 trường.';
    return;
  }
  btn.disabled = true; msg.textContent = 'Đang lưu...';
  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error();
    $('loai').value = ''; $('mota').value = ''; $('noidung').value = '';
    msg.textContent = 'Đã lưu.';
    await load();
  } catch (e) {
    msg.textContent = 'Lưu thất bại, thử lại.';
  } finally {
    btn.disabled = false;
  }
});

tbody.addEventListener('click', async (e) => {
  const id = e.target.dataset && e.target.dataset.id;
  if (!id || !confirm('Xóa dòng này?')) return;
  await fetch('/api/entries/' + id, { method: 'DELETE' });
  load();
});

load();
</script>
</body>
</html>`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/' || pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

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
      if (!mo_ta || !loai || !noi_dung) return json({ error: 'Thiếu dữ liệu' }, 400);
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
