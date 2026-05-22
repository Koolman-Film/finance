# คู่มือ Deploy ระบบ Finance ขึ้น Production

> เป้าหมาย: ขึ้นระบบที่ <https://finance.kool-man.com> โดยใช้ Vercel + Supabase Cloud (free tier ทั้งคู่)

หากต้องการรันบนเครื่องของตัวเองเพื่อทดสอบ ให้ดู [README.md](../README.md) แทน

ดู [URL-STRATEGY.md](./URL-STRATEGY.md) สำหรับเหตุผลที่ใช้ `finance.kool-man.com`

---

## รายการที่ต้องเตรียมก่อนเริ่ม

- โดเมน `kool-man.com` (มีอยู่แล้ว — ดูที่ผู้ให้บริการ DNS เช่น Cloudflare / Namecheap)
- บัญชี Vercel (มีอยู่แล้ว) → <https://vercel.com>
- บัญชี Supabase Cloud (มีอยู่แล้ว) → <https://supabase.com>
- โค้ดอยู่บน GitHub (push repo นี้ขึ้นไปก่อน)

---

## ขั้นที่ 1: ตั้งค่า Supabase Cloud

### 1.1 สร้าง project (ถ้ายังไม่ได้สร้าง)

ที่ Supabase Dashboard:

1. กด **New project**
2. ตั้งชื่อ เช่น `kool-man-finance` (ภายหลัง อย่าเปลี่ยน organization ที่อยู่แล้ว)
3. ตั้งรหัสฐานข้อมูล (จดไว้)
4. เลือก region ใกล้ลูกค้า: **Southeast Asia (Singapore)** สำหรับไทย
5. กด **Create new project** รอ ~2 นาที

### 1.2 คัดลอกข้อมูลเชื่อมต่อ

ที่หน้า project ของคุณ:

- **Project Settings → API**:
  - คัดลอก `Project URL` → ใส่ใน `.env` เป็น `NEXT_PUBLIC_SUPABASE_URL`
  - คัดลอก `anon public` (หรือ `Publishable`) → ใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - คัดลอก `service_role` (หรือ `Secret`) → ใส่ใน `SUPABASE_SERVICE_ROLE_KEY`
    > ⚠ key นี้เป็นความลับ ห้ามใส่ในโค้ดหรือเผยแพร่
- **Project Settings → Database → Connection string → URI**:
  - แท็บ **Transaction (port 6543)** → ใส่ใน `DATABASE_URL` (เพิ่ม `?pgbouncer=true` ต่อท้าย)
  - แท็บ **Session (port 5432)** → ใส่ใน `DIRECT_URL`

### 1.3 รัน migrations (สร้างตารางในฐานข้อมูล)

ที่เครื่องของคุณ:

```bash
# 1. คัดลอก .env แล้วใส่ค่า cloud
cp .env.example .env
# แก้ .env ใส่ค่าทั้ง 5 ตัวจาก Supabase Cloud

# 2. ติดตั้ง dependencies (ครั้งแรกเท่านั้น)
npm install

# 3. apply migrations
npm run prisma:deploy

# 4. ใส่ข้อมูลตั้งต้น (4 สาขา + 2 แหล่งจ่ายเงิน)
npm run seed
```

### 1.4 สร้าง Storage bucket สำหรับไฟล์แนบ

ที่ Supabase Dashboard → **SQL Editor** → **New query** → paste:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entry-files',
  'entry-files',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

กด **Run** — ควรขึ้น `Success`

### 1.5 ตั้งค่า Auth URLs (สำคัญมาก)

ที่ Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://finance.kool-man.com`
- **Redirect URLs** (กด Add):
  - `https://finance.kool-man.com/**`
  - `http://localhost:3000/**` (สำหรับ dev)
  - หากจะมี Vercel preview deployment ให้เพิ่ม `https://*-yourname.vercel.app/**` ด้วย

หากไม่ใส่ login จะใช้ไม่ได้

---

## ขั้นที่ 2: Deploy ขึ้น Vercel

### 2.1 Import project

1. ที่ Vercel: **Add New → Project**
2. เลือก repo `inout` (หรือชื่อที่ตั้งไว้)
3. Vercel จะตรวจพบ Next.js อัตโนมัติ — ไม่ต้องแตะ build settings

### 2.2 ใส่ Environment Variables

ในหน้า import เลื่อนลงไปที่ **Environment Variables** ใส่ทั้ง 5 ตัวจาก `.env`:

| Key                             | Value                                           |
| ------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://YOUR-PROJECT.supabase.co`              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` หรือ `eyJ...`              |
| `SUPABASE_SERVICE_ROLE_KEY`     | `sb_secret_...` หรือ `eyJ...`                   |
| `DATABASE_URL`                  | `postgresql://...:6543/postgres?pgbouncer=true` |
| `DIRECT_URL`                    | `postgresql://...:5432/postgres`                |

เลือก scope: **Production, Preview, Development** ทั้งสามเลย (กดปุ่มสามจุดถ้าไม่เห็น)

### 2.3 Deploy

กด **Deploy** รอ ~3 นาที

หลังเสร็จจะได้ URL ชั่วคราว เช่น `https://inout-abc123.vercel.app` ทดสอบเปิดดูได้

---

## ขั้นที่ 3: ผูก domain finance.kool-man.com

### 3.1 ที่ Vercel

1. ไปที่ project → **Settings → Domains**
2. กด **Add** ใส่ `finance.kool-man.com` → **Add**
3. Vercel จะบอกให้ตั้ง DNS record (CNAME)

### 3.2 ที่ผู้ให้บริการ DNS ของ kool-man.com

เพิ่ม record:

| Type    | Name      | Value                  | TTL  |
| ------- | --------- | ---------------------- | ---- |
| `CNAME` | `finance` | `cname.vercel-dns.com` | Auto |

(หากใช้ Cloudflare: ปิด Proxy (สีส้ม → สีเทา) ก่อน เพื่อให้ Vercel ทำ SSL ได้)

### 3.3 รอ SSL

Vercel ออก SSL อัตโนมัติภายใน 1-2 นาที หลังเห็น DNS

เสร็จแล้วเปิด <https://finance.kool-man.com> ได้

### 3.4 (ทางเลือก) Redirect kool-man.com → finance.kool-man.com

ยังไม่มีหน้า landing — ให้ apex redirect ไปยังระบบ finance ไปก่อน

ที่ DNS เพิ่ม:

| Type             | Name | Value              |
| ---------------- | ---- | ------------------ |
| `ALIAS` หรือ `A` | `@`  | (ตาม Vercel แนะนำ) |

ที่ Vercel project: **Settings → Domains** → เพิ่ม `kool-man.com` → เลือก
**Redirect to `finance.kool-man.com`** (เปลี่ยนภายหลังเมื่อมี landing จริง)

---

## ขั้นที่ 4: สร้างผู้ดูแลระบบคนแรก

### 4.1 สร้างบัญชี Auth ใน Supabase Dashboard

**Authentication → Users → Add user**:

- Email: `admin@kool-man.com` (หรืออีเมลจริงของคุณ)
- Password: ตั้งรหัสที่ปลอดภัย (จดไว้)
- **Auto Confirm User**: ✓

### 4.2 แต่งตั้งเป็น ADMIN

ที่เครื่องของคุณ (env ยังชี้ไปยัง cloud อยู่):

```bash
npm run set-admin -- admin@kool-man.com "ผู้ดูแลระบบ"
```

ขึ้น `Promoted admin@kool-man.com (ผู้ดูแลระบบ) to ADMIN` = สำเร็จ

### 4.3 Login ครั้งแรก

เปิด <https://finance.kool-man.com> → log in ด้วย email + password → ควรเข้าหน้า สรุปภาพรวม

ปุ่ม **ผู้ดูแล** ที่มุมขวาบน → เปิด `/admin/users` → กด **+ เพิ่มผู้ใช้** เพื่อสร้างพนักงานสาขา

---

## เมื่อ deploy ครั้งต่อๆ ไป

แค่ `git push` ขึ้น branch ที่ Vercel ตั้งเป็น production (โดยปกติ `main`)
Vercel จะ build + deploy เองอัตโนมัติ ~2 นาที

หาก schema เปลี่ยน:

```bash
# ที่เครื่อง (env ชี้ไปยัง cloud)
npm run prisma:migrate -- --name describe_what_changed   # สร้าง + apply local
git add prisma/migrations/ && git commit -m "feat(db): ..."
git push
# Vercel จะ build (รวม prisma generate) แต่ migrate prod ต้องรันเองอีกครั้ง:
npm run prisma:deploy
```

---

## ปัญหาที่พบบ่อย

### Login แล้วเด้งกลับมาที่ /login

→ Redirect URLs ใน Supabase Auth ยังไม่ครอบคลุม `https://finance.kool-man.com/**`
→ แก้ที่ Supabase Dashboard → Auth → URL Configuration

### ลิงก์อีเมล (เชิญผู้ใช้ / รีเซ็ตรหัสผ่าน) ขึ้น ERR_TOO_MANY_REDIRECTS

→ มักเกิดจาก **Site URL** หรือ **Redirect URLs** ใน Supabase ไม่ตรงกับ production
→ แก้ที่ Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://finance.kool-man.com` (ไม่มี trailing slash ไม่มี path)
- **Redirect URLs** (ใส่ทุกตัว):
  - `https://finance.kool-man.com/auth/callback`
  - `https://finance.kool-man.com/auth/callback?next=*`
  - `https://finance.kool-man.com/**` (กันเหนียว)

ห้ามใส่ apex `https://kool-man.com` เป็น Site URL — Vercel จะ redirect ไป `finance.` ทำให้ลิงก์อีเมลวนลูป

### ลิงก์อีเมลหมดอายุเร็วเกินไป

→ ค่าเริ่มต้นของ Supabase คือ 1 ชั่วโมง — โปรเจกต์นี้ตั้งให้เป็น 24 ชั่วโมงทั้ง local + production
→ ถ้า production ยังเป็น 1 ชั่วโมง: Supabase Dashboard → Authentication → Email → **Email OTP Expiry** = `86400`

### `Error: connect ETIMEDOUT` ตอน prisma migrate

→ `DATABASE_URL` ผิด หรือ Supabase project ยังไม่พร้อม รอ 2-3 นาทีแล้วลองใหม่

### หน้าเว็บขึ้นแต่ทุกหน้า error 500

→ Vercel Logs (Project → Deployments → คลิก deploy → Functions tab) มักเป็น env var ขาด
→ ตรวจสอบให้ครบทั้ง 5 ตัว และอยู่ใน scope Production

### ไฟล์อัปโหลดไม่ขึ้น

→ ยังไม่ได้สร้าง bucket → ทำขั้นที่ 1.4
→ หรือ `SUPABASE_SERVICE_ROLE_KEY` ผิด (ต้องเป็น service_role/secret ไม่ใช่ anon)

### PDF/Excel export 500

→ Vercel function timeout — ถ้าข้อมูลเยอะมากใน free tier (10s limit) ต้อง upgrade plan
→ หรือลด scope ของ export (เลือก 1 เดือน 1 สาขา)

### Vercel build fail ที่ขั้น "Collecting page data"

→ `DATABASE_URL` ที่ใส่ใน Vercel เชื่อมต่อไม่ได้ — ตรวจสอบให้แน่ใจว่ามี `?pgbouncer=true`
ต่อท้ายตามที่บอกในขั้นที่ 1.2

---

## ค่าใช้จ่าย (ณ ปัจจุบัน)

- Vercel Hobby tier: **ฟรี** (จำกัด 100GB bandwidth/เดือน, function execution 100GB-hr — ปกติเพียงพอสำหรับร้านขนาดเล็ก)
- Supabase Free tier: **ฟรี** (DB 500MB, Storage 1GB, Auth ไม่จำกัด user, 50,000 monthly active users)
- โดเมน `.com`: ~400-600 บาท/ปี (จ่ายอยู่แล้ว)

หากธุรกิจโต อาจต้อง upgrade Supabase เป็น Pro ($25/เดือน) เมื่อใช้ DB เกิน 500MB
