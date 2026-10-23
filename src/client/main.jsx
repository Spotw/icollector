import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const SESSION_ENTRIES_KEY = 'icollector.current-session-entry-ids';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  const paths = {
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Không thể hoàn tất yêu cầu.');
  return data;
}

function App() {
  const [entries, setEntries] = useState([]);
  const [sessionEntryIds, setSessionEntryIds] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [form, setForm] = useState({ mo_ta: '', loai_thong_tin: '', noi_dung: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmEntry, setConfirmEntry] = useState(null);
  const [notice, setNotice] = useState(null);

  async function loadEntries(currentSessionIds = sessionEntryIds) {
    setLoading(true);
    try {
      const allEntries = await request('/api/entries');
      setEntries(allEntries.filter((entry) => currentSessionIds.has(entry.id)));
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentSessionEntries() {
      try {
        const storedIds = window.sessionStorage.getItem(SESSION_ENTRIES_KEY);
        const parsedIds = storedIds ? JSON.parse(storedIds) : [];
        if (!Array.isArray(parsedIds) || !parsedIds.every(Number.isSafeInteger)) {
          throw new Error('Không thể đọc danh sách thông tin của phiên hiện tại.');
        }

        const currentSessionIds = new Set(parsedIds);
        setSessionEntryIds(currentSessionIds);
        await loadEntries(currentSessionIds);
      } catch (error) {
        setNotice({ type: 'error', text: error.message });
        setLoading(false);
      }
    }

    loadCurrentSessionEntries();
  }, []);

  const categories = useMemo(
    () => [...new Set(entries.map((entry) => entry.loai_thong_tin))],
    [entries],
  );
  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return entries.filter((entry) => {
      const matchesCategory = category === 'Tất cả' || entry.loai_thong_tin === category;
      const matchesQuery = !normalizedQuery
        || `${entry.mo_ta} ${entry.loai_thong_tin} ${entry.noi_dung}`
          .toLocaleLowerCase('vi').includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [entries, query, category]);

  function updateForm(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function saveEntry(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const result = await request('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const currentSessionIds = new Set(sessionEntryIds);
      currentSessionIds.add(result.id);
      window.sessionStorage.setItem(SESSION_ENTRIES_KEY, JSON.stringify([...currentSessionIds]));
      setSessionEntryIds(currentSessionIds);
      setForm({ mo_ta: '', loai_thong_tin: '', noi_dung: '' });
      setNotice({ type: 'success', text: 'Đã lưu thông tin mới vào bộ sưu tập.' });
      await loadEntries(currentSessionIds);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry() {
    if (!confirmEntry) return;
    setDeleting(confirmEntry.id);
    setNotice(null);
    try {
      await request(`/api/entries/${confirmEntry.id}`, { method: 'DELETE' });
      setEntries((current) => current.filter((entry) => entry.id !== confirmEntry.id));
      setNotice({ type: 'success', text: 'Đã xóa thông tin khỏi bộ sưu tập.' });
      setConfirmEntry(null);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="iCollector trang chủ">
          <span className="brand-mark"><Icon name="spark" size={21} /></span>
          <span>iCollector<span className="brand-dot">.</span></span>
        </a>
        <div className="sidebar-label">KHÔNG GIAN CỦA BẠN</div>
        <button className="nav-item active" type="button">
          <Icon name="grid" size={19} /><span>Bộ sưu tập</span>
          <span className="nav-count">{entries.length}</span>
        </button>
        <div className="sidebar-note">
          <span className="note-icon"><Icon name="note" size={17} /></span>
          <p>Mọi ý tưởng hay đều xứng đáng được lưu giữ.</p>
          <span>Góc nhỏ của riêng bạn ✨</span>
        </div>
        <div className="sidebar-footer"><span className="online-dot" /> Đồng bộ với Cloudflare D1</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Không gian</span><span className="crumb-slash">/</span><strong>Bộ sưu tập</strong></div>
          <div className="today"><Icon name="clock" size={16} /><span>{dateFormatter.format(new Date())}</span></div>
        </header>

        <section className="welcome">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> GHI LẠI ĐIỀU QUAN TRỌNG</div>
            <h1>Chào bạn, <span>người sưu tầm.</span></h1>
            <p>Một nơi gọn gàng để cất giữ ý tưởng, công việc và những điều bạn muốn nhớ.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <span className="art-star star-one">✳</span><span className="art-star star-two">✦</span>
            <div className="art-card"><Icon name="note" size={27} /></div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Tổng quan bộ sưu tập">
          <article className="stat-card">
            <div className="stat-top"><span className="stat-label">Tổng thông tin</span><span className="stat-icon violet"><Icon name="grid" size={18} /></span></div>
            <div className="stat-value">{entries.length}<span> mục đã lưu</span></div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-label">Danh mục</span><span className="stat-icon mint"><Icon name="spark" size={18} /></span></div>
            <div className="stat-value">{categories.length}<span> chủ đề</span></div>
          </article>
          <article className="stat-card stat-tip">
            <span className="tip-spark">✦</span>
            <div><strong>Ý tưởng nhỏ, thay đổi lớn.</strong><span>Lưu lại ngay khi bạn nghĩ đến nhé.</span></div>
            <Icon name="arrow" size={18} />
          </article>
        </section>

        <section className="content-grid">
          <section className="panel collection-panel">
            <div className="panel-heading">
              <div><div className="section-kicker">CỦA BẠN</div><h2>Bộ sưu tập</h2></div>
              <span className="total-pill">{entries.length} mục</span>
            </div>
            <div className="toolbar">
              <label className="search-box">
                <Icon name="search" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong bộ sưu tập..." aria-label="Tìm trong bộ sưu tập" />
                {query && <button className="clear-search" type="button" onClick={() => setQuery('')} aria-label="Xóa nội dung tìm kiếm"><Icon name="close" size={16} /></button>}
              </label>
            </div>
            {categories.length > 0 && (
              <div className="category-list" aria-label="Lọc theo danh mục">
                {['Tất cả', ...categories].map((item) => (
                  <button key={item} type="button" className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
            )}

            {notice && (
              <div className={`notice ${notice.type}`} role="status">
                <span>{notice.type === 'success' ? '✓' : '!'}</span>{notice.text}
                <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo"><Icon name="close" size={15} /></button>
              </div>
            )}

            <div className="entry-list">
              {loading ? (
                <div className="state-panel"><span className="spinner" /><span>Đang mở bộ sưu tập...</span></div>
              ) : filteredEntries.length === 0 ? (
                <div className="state-panel empty-state">
                  <span className="empty-icon"><Icon name={query || category !== 'Tất cả' ? 'search' : 'note'} size={23} /></span>
                  <strong>{query || category !== 'Tất cả' ? 'Không tìm thấy thông tin phù hợp' : 'Bộ sưu tập còn trống'}</strong>
                  <span>{query || category !== 'Tất cả' ? 'Thử từ khóa hoặc danh mục khác nhé.' : 'Lưu lại điều đầu tiên bạn muốn nhớ.'}</span>
                  {query || category !== 'Tất cả'
                    ? <button className="text-button" type="button" onClick={() => { setQuery(''); setCategory('Tất cả'); }}>Xóa bộ lọc</button>
                    : <button className="text-button" type="button" onClick={() => document.getElementById('entry-description')?.focus()}>Thêm thông tin đầu tiên <span>↗</span></button>}
                </div>
              ) : filteredEntries.map((entry) => (
                <article className="entry-card" key={entry.id}>
                  <span className="entry-mark"><Icon name="note" size={18} /></span>
                  <div className="entry-body">
                    <div className="entry-meta"><span className="entry-category">{entry.loai_thong_tin}</span><span className="entry-date"><Icon name="clock" size={13} />{formatDate(entry.created_at)}</span></div>
                    <h3>{entry.mo_ta}</h3>
                    {entry.noi_dung && <p>{entry.noi_dung}</p>}
                  </div>
                  <button className="delete-button" type="button" onClick={() => setConfirmEntry(entry)} aria-label={`Xóa ${entry.mo_ta}`} title="Xóa thông tin"><Icon name="trash" size={17} /></button>
                </article>
              ))}
            </div>
            {!loading && filteredEntries.length > 0 && (
              <div className="list-footer">Đang hiển thị <strong>{filteredEntries.length}</strong> trong tổng số <strong>{entries.length}</strong> thông tin</div>
            )}
          </section>

          <aside className="panel form-panel">
            <div className="form-heading">
              <span className="form-icon"><Icon name="plus" size={21} /></span>
              <div><div className="section-kicker">LƯU LẠI NGAY</div><h2>Thêm thông tin</h2></div>
            </div>
            <p className="form-intro">Ghi lại một ý tưởng hay điều bạn muốn nhớ.</p>
            <form onSubmit={saveEntry}>
              <label className="field-label" htmlFor="entry-category">Loại thông tin <span>*</span></label>
              <input id="entry-category" name="loai_thong_tin" value={form.loai_thong_tin} onChange={updateForm} placeholder="Ví dụ: Công việc, Ý tưởng..." maxLength={100} required />
              <label className="field-label" htmlFor="entry-description">Mô tả ngắn <span>*</span></label>
              <input id="entry-description" name="mo_ta" value={form.mo_ta} onChange={updateForm} placeholder="Điều bạn muốn lưu là gì?" maxLength={300} required />
              <label className="field-label" htmlFor="entry-content">Nội dung chi tiết <span className="optional">(không bắt buộc)</span></label>
              <textarea id="entry-content" name="noi_dung" value={form.noi_dung} onChange={updateForm} placeholder="Thêm vài dòng để nhớ rõ hơn..." maxLength={10000} rows={5} />
              <div className="character-count">{form.noi_dung.length.toLocaleString('vi-VN')} / 10.000</div>
              <button className="submit-button" type="submit" disabled={saving || loading}>
                {saving ? <><span className="button-spinner" />Đang lưu...</> : <><Icon name="plus" size={18} /> Lưu vào bộ sưu tập</>}
              </button>
              <div className="privacy-note"><span>✦</span> Thông tin của bạn được lưu trong bộ sưu tập.</div>
            </form>
          </aside>
        </section>
        <footer className="page-footer">Được tạo nên để giữ lại những điều có ý nghĩa <span>✦</span></footer>
      </main>

      {confirmEntry && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmEntry(null); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <span className="confirm-icon"><Icon name="trash" size={21} /></span>
            <h2 id="confirm-title">Xóa thông tin này?</h2>
            <p>“{confirmEntry.mo_ta}” sẽ bị xóa khỏi bộ sưu tập. Bạn không thể hoàn tác thao tác này.</p>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setConfirmEntry(null)} disabled={Boolean(deleting)}>Giữ lại</button>
              <button type="button" className="confirm-delete-button" onClick={deleteEntry} disabled={Boolean(deleting)}>{deleting ? 'Đang xóa...' : 'Xóa thông tin'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
