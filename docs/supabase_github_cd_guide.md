# 🚀 Hướng Dẫn CI/CD Database Với Supabase CLI & GitHub Actions

Tài liệu này hướng dẫn cách vận hành, cấu hình và phát triển hệ thống cơ sở dữ liệu quan hệ của **Beer Voter** theo quy trình tự động hóa (Continuous Deployment - CD) sử dụng **Supabase CLI** kết hợp với **GitHub Actions** cho 2 môi trường: **Development** (Dev) và **Production** (Main).

---

## 1. ⚙️ Kiến Trúc CD Môi Trường Kép (Dual-Environment)

Hệ thống được thiết kế để tự động nhận diện nhánh Git được push và thực hiện deploy lên dự án Supabase tương ứng:

```
                  ┌─────────────── Git Push ──────────────┐
                  │                                       │
           Nhánh `develop`                           Nhánh `main`
                  │                                       │
                  ▼                                       ▼
        [ Supabase CD Workflow ]               [ Supabase CD Workflow ]
        (Dùng Secrets Dev)                     (Dùng Secrets Main)
                  │                                       │
                  ▼                                       ▼
      ⚡ Deploy to Supabase DEV               🚀 Deploy to Supabase PROD
```

---

## 2. 📂 Cấu Trúc Mã Nguồn Cơ Sở Dữ Liệu (`supabase/`)

Toàn bộ cấu trúc cơ sở dữ liệu của bạn giờ đây được quản lý như một phần của mã nguồn trong thư mục `supabase/`:

- **`supabase/config.toml`**: File cấu hình dự án Supabase local.
- **`supabase/migrations/`**: Thư mục chứa các file mã SQL di cư cấu trúc database (migrations).
  - Mỗi file SQL trong thư mục này đại diện cho một bước thay đổi cấu trúc bảng, được đặt tên bắt đầu bằng chuỗi thời gian (timestamp) để đảm bảo chạy đúng thứ tự:
    - `20260530043312_init_schema.sql` (File khởi tạo 5 bảng quan hệ chính ban đầu).

---

## 🔒 3. Hướng Dẫn Cấu Hình Secrets Trên GitHub

Để kích hoạt hệ thống tự động deploy này, bạn cần truy cập vào repository của dự án trên GitHub và cấu hình các mã khóa bảo mật (**Secrets**):

1. Vào dự án trên GitHub ➔ **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Nhấn **New repository secret** để lần lượt thêm 5 biến sau:

| Tên Biến (Secret Key)           | Vai trò & Cách lấy trên Supabase                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`SUPABASE_ACCESS_TOKEN`**     | Khóa truy cập cá nhân của bạn (Lấy trên Supabase Dashboard tại _Account Settings ➔ Access Tokens ➔ Generate new token_). Dùng chung cho cả 2 môi trường. |
| **`SUPABASE_PROJECT_REF_DEV`**  | Mã Reference ID của dự án **Supabase Dev** (Lấy tại _Project Settings ➔ General ➔ Reference ID_).                                                        |
| **`SUPABASE_DB_PASSWORD_DEV`**  | Mật khẩu database PostgreSQL của dự án **Supabase Dev** (Mật khẩu bạn tự đặt lúc tạo dự án).                                                             |
| **`SUPABASE_PROJECT_REF_MAIN`** | Mã Reference ID của dự án **Supabase Main (Prod)**.                                                                                                      |
| **`SUPABASE_DB_PASSWORD_MAIN`** | Mật khẩu database PostgreSQL của dự án **Supabase Main (Prod)**.                                                                                         |

---

## 🔄 4. Quy Trình Phát Triển & Deploy Chuẩn (Workflow)

Từ nay về sau, khi bạn cần thay đổi cấu trúc cơ sở dữ liệu (ví dụ: thêm cột mới, tạo bảng mới), hãy tuân thủ quy trình chuyên nghiệp sau:

### Bước 1: Tạo file Migration mới ở local

Trong Terminal tại thư mục gốc dự án của bạn, chạy lệnh sau để CLI tự tạo một file migration SQL trống với timestamp hiện tại:

```bash
npx supabase migrations new ten_tinh_nang_moi
```

_Hệ thống sẽ tạo ra một file trống tại: `supabase/migrations/<timestamp>_ten_tinh_nang_moi.sql`_

### Bước 2: Viết mã SQL thay đổi cấu trúc

Mở file SQL vừa được tạo ra và viết câu lệnh SQL thay đổi cấu trúc dữ liệu của bạn.
_Ví dụ (Thêm cột avatar vào bảng guests):_

```sql
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS avatar_url text;
```

### Bước 3: Đẩy code lên nhánh Phát triển (`develop`)

1. Thêm file và commit:
   ```bash
   git add .
   git commit -m "feat(db): add avatar_url column to guests table"
   ```
2. Push lên GitHub:
   ```bash
   git push origin develop
   ```

- **Kết quả**: GitHub Actions sẽ tự động phát hiện thay đổi trong thư mục `supabase/` và kích hoạt workflow `Supabase CD`. Nó sẽ tự động kết nối và chạy câu lệnh SQL này lên dự án **Supabase Dev** của bạn!

### Bước 4: Phát hành chính thức lên Production (`main`)

Khi mọi tính năng đã được kiểm thử ổn định trên môi trường Dev, bạn tạo Pull Request để merge nhánh `develop` vào nhánh **`main`**.

- **Kết quả**: Ngay khi code được merge vào nhánh `main`, GitHub Actions sẽ tự động chạy workflow CD sử dụng cấu hình của **Supabase Main (Prod)**, nâng cấp database production của bạn lên phiên bản mới nhất hoàn toàn tự động và an toàn!
