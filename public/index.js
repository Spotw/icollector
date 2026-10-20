const $ = (id) => document.getElementById(id);
const tbody = $('tbody'), msg = $('msg'), btn = $('btnSave');

function val(s) {
  return s ? esc(s) : '<span style="color:var(--muted)">—</span>';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const TZ = 'Asia/Ho_Chi_Minh';

// created_at lưu dạng UTC "YYYY-MM-DD HH:MM:SS" -> hiển thị giờ Việt Nam
function fmtTime(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return esc(s);
  return d.toLocaleString('vi-VN', { timeZone: TZ, hour12: false });
}

function tick() {
  $('clock').textContent = new Date().toLocaleString('vi-VN', {
    timeZone: TZ, hour12: false, weekday: 'long',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
tick();
setInterval(tick, 1000);

// Chỉ hiển thị các dòng vừa thêm trong lần mở trang này (dữ liệu cũ vẫn nằm trong D1)
const sessionIds = new Set();

async function load() {
  try {
    if (!sessionIds.size) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Chưa có thông tin nào được thêm</td></tr>';
      return;
    }
    const res = await fetch('/api/entries');
    const data = (await res.json()).filter(r => sessionIds.has(r.id));
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Chưa có thông tin nào được thêm</td></tr>';
      return;
    }
    tbody.innerHTML = data.map((r, i) =>
      '<tr><td class="stt">' + (i + 1) + '</td>' +
      '<td>' + val(r.mo_ta) + '</td>' +
      '<td>' + val(r.loai_thong_tin) + '</td>' +
      '<td class="nd">' + val(r.noi_dung) + '</td>' +
      '<td class="tg">' + fmtTime(r.created_at) + '</td>' +
      '<td><button class="del" data-id="' + r.id + '">Xóa</button></td></tr>'
    ).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Không tải được dữ liệu</td></tr>';
  }
}

btn.addEventListener('click', async () => {
  const body = {
    loai_thong_tin: $('loai').value.trim(),
    mo_ta: $('mota').value.trim(),
    noi_dung: $('noidung').value.trim(),
  };
  if (!body.loai_thong_tin || !body.mo_ta) {
    msg.textContent = 'Vui lòng nhập Loại thông tin và Mô tả (Nội dung có thể để trống).';
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
    sessionIds.add((await res.json()).id);
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
  sessionIds.delete(Number(id));
  load();
});

load();
// Đồng hồ 3D (Three.js + GSAP). Nếu thư viện/WebGL lỗi thì chỉ còn dòng chữ giờ bên dưới.
(function () {
  var holder = document.getElementById('clockCanvas');
  if (!holder) return;
  if (!window.THREE || !window.gsap) { holder.style.display = 'none'; return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { holder.style.display = 'none'; return; }

  var SIZE = 240;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(SIZE, SIZE);
  holder.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  var sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(3, 4, 6);
  scene.add(sun);

  var tilt = new THREE.Group();   // nghiêng theo chuột + nhấp nhô
  var clock = new THREE.Group();  // hiệu ứng xuất hiện
  tilt.add(clock);
  scene.add(tilt);

  // Mặt đồng hồ + viền
  var face = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.3, 64),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
  );
  face.rotation.x = Math.PI / 2;
  clock.add(face);

  var rim = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.14, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.5, roughness: 0.35 })
  );
  clock.add(rim);

  // 12 vạch giờ
  var tickMat = new THREE.MeshStandardMaterial({ color: 0xf9fafb });
  for (var i = 0; i < 12; i++) {
    var major = i % 3 === 0;
    var a = (i * Math.PI) / 6;
    var tick = new THREE.Mesh(
      new THREE.BoxGeometry(major ? 0.12 : 0.07, major ? 0.4 : 0.22, 0.06),
      tickMat
    );
    tick.position.set(Math.sin(a) * 1.95, Math.cos(a) * 1.95, 0.19);
    tick.rotation.z = -a;
    clock.add(tick);
  }

  // Kim: pivot đặt ở tâm, thân kim hơi nhô về phía đuôi
  function makeHand(len, width, color, z) {
    var pivot = new THREE.Group();
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, len, 0.06),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 })
    );
    mesh.position.y = len / 2 - 0.2;
    pivot.add(mesh);
    pivot.position.z = z;
    clock.add(pivot);
    return pivot;
  }
  var hourHand = makeHand(1.2, 0.16, 0xf9fafb, 0.23);
  var minHand = makeHand(1.8, 0.11, 0xf9fafb, 0.27);
  var secHand = makeHand(2.0, 0.04, 0xef4444, 0.31);

  var cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.1, 24),
    new THREE.MeshStandardMaterial({ color: 0xef4444 })
  );
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.34;
  clock.add(cap);

  // ---- Thời gian (giờ Việt Nam = UTC+7, không có giờ mùa hè) ----
  var TWO_PI = Math.PI * 2;
  function vnSeconds() { return Math.floor(Date.now() / 1000) + 7 * 3600; }
  var start = vnSeconds();
  var a0s = -TWO_PI * ((start % 60) / 60);
  var a0m = -TWO_PI * ((start % 3600) / 3600);
  var a0h = -TWO_PI * ((start % 43200) / 43200);
  var first = true;

  function setTime() {
    var el = vnSeconds() - start; // số giây đã trôi, giúp góc quay liên tục, không bị lùi khi qua 12h
    var dur = first ? 1.6 : null;
    gsap.to(secHand.rotation, { z: a0s - TWO_PI * el / 60, duration: first ? 1.6 : 0.4, ease: first ? 'power3.out' : 'back.out(3)', overwrite: true });
    gsap.to(minHand.rotation, { z: a0m - TWO_PI * el / 3600, duration: first ? 1.6 : 0.5, ease: first ? 'power3.out' : 'power1.out', overwrite: true });
    gsap.to(hourHand.rotation, { z: a0h - TWO_PI * el / 43200, duration: first ? 1.6 : 0.5, ease: first ? 'power3.out' : 'power1.out', overwrite: true });
    first = false;
  }
  function loop() {
    setTime();
    setTimeout(loop, 1000 - (Date.now() % 1000) + 5); // bám sát đầu mỗi giây
  }
  loop();

  // ---- Hiệu ứng GSAP ----
  gsap.from(clock.scale, { x: 0.2, y: 0.2, z: 0.2, duration: 1.2, ease: 'back.out(1.7)' });
  gsap.from(clock.rotation, { y: -TWO_PI, duration: 1.4, ease: 'power3.out' });
  gsap.to(tilt.position, { y: 0.08, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });

  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    gsap.to(tilt.rotation, { y: nx * 0.5, x: ny * 0.4, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
  });
  document.addEventListener('pointerleave', function () {
    gsap.to(tilt.rotation, { x: 0, y: 0, duration: 1, ease: 'power2.out', overwrite: 'auto' });
  });

  (function render() {
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  })();
})();

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
