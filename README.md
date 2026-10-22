# iCollector

iCollector là ứng dụng lưu trữ thông tin cá nhân với giao diện React, API Hono và cơ sở dữ liệu Cloudflare D1.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+
- pnpm 9+
- Tài khoản Cloudflare để triển khai D1 lên môi trường production

## Cài đặt

```bash
pnpm install
pnpm db:init:local
pnpm dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://localhost:5173`). Vite phục vụ giao diện và chuyển tiếp `/api` đến Hono/Wrangler trên cổng `8787`.

## Các lệnh

| Lệnh | Mô tả |
| --- | --- |
| `pnpm dev` | Build giao diện, chạy Hono/Wrangler và Vite |
| `pnpm build` | Tạo giao diện production trong `dist/` |
| `pnpm preview` | Build và chạy bản production bằng Wrangler |
| `pnpm db:init:local` | Tạo bảng D1 cho phát triển cục bộ |
| `pnpm db:init` | Tạo bảng D1 trên Cloudflare |
| `pnpm run deploy` | Build và triển khai Worker cùng giao diện |

## D1 production

`wrangler.jsonc` liên kết database `db_duyvu`. Chạy `pnpm db:init` một lần để tạo bảng, rồi `pnpm run deploy` để triển khai. Nếu dùng database khác, cập nhật `database_name` và `database_id` trong `wrangler.jsonc`.

## API

- `GET /api/entries` — liệt kê thông tin mới nhất.
- `POST /api/entries` — thêm thông tin. `mo_ta` và `loai_thong_tin` là bắt buộc.
- `DELETE /api/entries/:id` — xóa một thông tin đã lưu.
