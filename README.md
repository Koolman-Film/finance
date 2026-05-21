# Finnix Film — inout (ระบบจัดการรายรับ-รายจ่าย)

ระบบบันทึกรายรับ-รายจ่ายของกิจการ Finnix Film แบบใช้งานออนไลน์หลายคน

> **Production**: <https://finance.kool-man.com> · สำหรับขั้นตอน deploy ดู [docs/DEPLOY.md](./docs/DEPLOY.md)

**ในเวอร์ชันปัจจุบัน v1.0:**

- ระบบสมาชิก (Email/Password) + จำกัดสิทธิ์ตามสาขา (Admin / Staff)
- บันทึก/แก้ไข/ลบรายการรายรับ-รายจ่าย พร้อมประวัติผู้บันทึก
- กรองตามสาขา + เดือน (เริ่มต้นที่เดือนปัจจุบัน, เลขปี พ.ศ.)
- ล็อคข้อมูลรายเดือน (admin) — เดือนที่ล็อคแล้วแก้ไขไม่ได้
- แนบไฟล์ (ใบงาน, หลักฐานการชำระเงิน, ใบเสร็จ) ผ่าน Supabase Storage
- ส่งออกรายงาน Excel และ PDF (พร้อมฟอนต์ไทย Sarabun)
- หน้าผู้ดูแลระบบสำหรับจัดการสาขา / แหล่งจ่ายเงิน / ผู้ใช้ / การตั้งค่า

---

## เทคโนโลยีที่ใช้

| ส่วน       | เลือกใช้                                                        |
| ---------- | --------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19 + TypeScript                 |
| Styling    | Tailwind 4 (CSS-first) + shadcn/ui + Radix                      |
| Database   | Postgres ผ่าน **Supabase**                                      |
| ORM        | Prisma 6                                                        |
| Auth       | Supabase Auth (Email/Password) ผ่าน `@supabase/ssr`             |
| Storage    | Supabase Storage (signed URLs)                                  |
| Export     | exceljs (Excel), @react-pdf/renderer + Sarabun (PDF)            |
| Validation | zod 4                                                           |
| Deploy     | Vercel                                                          |
| Tooling    | ESLint 9 + Prettier + Husky + commitlint (Conventional Commits) |

---

## ส่วนที่ 1: รันที่เครื่องตัวเอง (สำหรับทดสอบ)

### วิธี A — Supabase Local (Docker) แนะนำ

ต้องมี [Docker Desktop](https://www.docker.com/products/docker-desktop/) และ
[Supabase CLI](https://supabase.com/docs/guides/local-development) ติดตั้งไว้ก่อน

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. เปิด Supabase ที่เครื่อง (Postgres + Auth + Storage + Studio)
supabase start
# จำค่าที่ขึ้นมาให้ดี: Project URL, Publishable key, Secret key, DB URL

# 3. ตั้งค่า .env (คัดลอกจาก .env.example)
cp .env.example .env
# แก้ค่าใน .env ให้ตรงกับที่ supabase start แสดง

# 4. สร้างตารางในฐานข้อมูล
npx prisma migrate dev --name init

# 5. เพิ่มข้อมูลตั้งต้น (4 สาขา + 2 แหล่งจ่ายเงิน)
npm run seed

# 6. ใส่ bucket สำหรับเก็บไฟล์แนบ
docker exec $(docker ps --format "{{.Names}}" | grep supabase.*db | head -1) \
  psql -U postgres -d postgres -f /dev/stdin \
  < supabase/migrations/*_entry_files_bucket.sql

# 7. สร้างผู้ดูแลระบบคนแรก
npm run set-admin -- admin@kool-man.com "ผู้ดูแลระบบ" admin12345

# 8. เริ่มเซิร์ฟเวอร์
npm run dev
```

เปิด <http://localhost:3000> → log in ด้วย `admin@kool-man.com` / `admin12345`

หน้า **Supabase Studio** สำหรับ debug DB: <http://localhost:54323>

หยุดเมื่อใช้เสร็จ:

```bash
supabase stop          # เก็บข้อมูลไว้
# หรือ
supabase stop --no-backup    # ลบข้อมูลทิ้ง
```

### วิธี B — Supabase Cloud (ฟรี, ไม่ต้องลง Docker)

1. ไปที่ <https://supabase.com> → สมัครบัญชี → **New project**
2. ตั้งชื่อโปรเจกต์ + รหัส DB → รอ ~2 นาที
3. ที่หน้าโปรเจกต์ของคุณ:
   - **Project Settings → API**: คัดลอก `Project URL`, `anon public` key, `service_role` key
   - **Project Settings → Database → Connection string → URI**: คัดลอก connection string
4. ทำ step 1, 3, 4, 5, 7, 8 ของวิธี A (ข้าม step 2, 6)
5. สำหรับ step 6 (bucket): ใน Supabase Dashboard → **SQL Editor** → paste เนื้อหาจาก
   `supabase/migrations/*_entry_files_bucket.sql` แล้วกด Run

---

## ส่วนที่ 2: Deploy ขึ้น Production

แยกเป็นเอกสารของตัวเอง — ดู **[docs/DEPLOY.md](./docs/DEPLOY.md)** สำหรับขั้นตอนตั้งแต่
สร้าง Supabase Cloud project, ใส่ env vars ใน Vercel, ผูกโดเมน
`finance.kool-man.com`, สร้าง storage bucket, จนถึงสร้างผู้ดูแลคนแรก

หากสนใจว่าทำไมเลือกใช้ subdomain (ไม่ใช่ `kool-man.com/finance`) ดู
**[docs/URL-STRATEGY.md](./docs/URL-STRATEGY.md)**

---

## การจัดการประจำวัน

ทำผ่านหน้าเว็บได้ทั้งหมด (ไม่ต้องแตะ SQL อีกแล้ว):

| งาน                                          | ทำที่                                                     |
| -------------------------------------------- | --------------------------------------------------------- |
| เพิ่มสาขาใหม่                                | `/admin/branches`                                         |
| เพิ่มแหล่งจ่ายเงิน (เช่น "เงินสำรองพี่หมวย") | `/admin/expense-sources`                                  |
| เพิ่มพนักงานใหม่ + กำหนดสาขา                 | `/admin/users`                                            |
| ล็อคเดือน (ปิดงบ)                            | `/admin/locks`                                            |
| สิทธิ์การแก้ไขข้ามผู้บันทึก                  | `/admin/settings`                                         |
| ออกรายงาน Excel/PDF                          | ปุ่ม PDF / Excel บน filter bar (ส่งออกตามตัวกรองปัจจุบัน) |

### ลืม admin คนสุดท้าย?

ระบบกันไว้แล้ว — admin คนสุดท้ายที่ active จะถูกล็อค ไม่ให้ลด/ปิดได้
หากเกิดเหตุสุดวิสัย (เช่น ลบใน DB ตรงๆ) รัน:

```bash
npm run set-admin -- email-ของคุณ "ชื่อ"
```

---

## โครงสร้างโค้ดที่ควรรู้

```
app/
  layout.tsx                   — Root layout
  page.tsx                     — redirect → /summary
  globals.css                  — Tailwind 4 + shadcn tokens (OKLCH)
  login/                       — หน้าเข้าสู่ระบบ
  logout/route.ts              — sign out endpoint
  (app)/                       — กลุ่มเส้นทางที่ต้อง login
    layout.tsx                 — header (มี admin link สำหรับ admin)
    summary/page.tsx           — สรุปยอด
    income/page.tsx            — รายการรายรับ
    expense/page.tsx           — รายการรายจ่าย
    _components/               — Tabs, FilterBar, EntryForm, FileSlot, ...
  admin/                       — auth-gated (requireAdmin)
    branches/, expense-sources/, users/, locks/, settings/
  api/export/{excel,pdf}/      — endpoints สร้างไฟล์รายงาน
components/
  ui/                          — shadcn primitives (Button, Dialog, Select, ...)
  ThaiMonthPicker.tsx          — month/year picker (เดือน + พ.ศ.)
lib/
  auth.ts                      — requireUser / requireAdmin
  branch-scope.ts              — บังคับ staff เห็นเฉพาะสาขาตัวเอง
  entry-actions.ts             — บันทึก/แก้ไข/ลบ entry (zod validated)
  admin-actions.ts             — server actions ของโซน admin
  file-actions.ts              — upload / delete / signed URL ของไฟล์แนบ
  exports/                     — Excel + PDF generators
  thai-date.ts                 — เลข พ.ศ. + ชื่อเดือนไทย
  filters.ts, format.ts, prisma.ts, utils.ts, supabase/
proxy.ts                       — Next 16 middleware (refresh Supabase session)
prisma/
  schema.prisma                — โครงสร้างฐานข้อมูล
  migrations/                  — Prisma migrations (app tables)
  seed.ts                      — สาขา + แหล่งจ่ายเงินตั้งต้น
supabase/
  config.toml                  — config local supabase stack
  migrations/                  — Supabase migrations (storage bucket)
scripts/set-admin.ts           — สร้าง/แต่งตั้ง admin
public/fonts/                  — Sarabun TTF (ใช้สร้าง PDF)
reference.html                 — ต้นแบบ Gemini (เก็บเป็น reference)
```

---

## คำสั่งที่ใช้บ่อย

```bash
npm run dev              # dev server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run format           # Prettier (เขียนทับ)
npm run seed             # ใส่ข้อมูลตั้งต้น
npm run set-admin        # เพิ่ม/แต่งตั้ง admin
npm run prisma:migrate   # สร้าง migration ใหม่ (local)
npm run prisma:deploy    # apply migrations ที่มีแล้ว (prod)
supabase start / stop    # local Supabase
supabase status          # ดู URL + keys
```

---

## การพัฒนาต่อ (Conventional Commits)

ทุก commit ต้องตรงรูป `<type>(<scope>): <message>` เช่น:

```
feat(admin): add branch sort order field
fix(auth): refresh session on tab focus
chore(deps): bump prisma to 6.20
```

`type` ที่อนุญาต: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`

`scope` ที่ใช้ในโปรเจกต์นี้: `db`, `auth`, `ui`, `entry`, `admin`,
`lock`, `files`, `export`, `scripts`, `deploy`, `tooling`, `deps`

ทุก commit จะรัน ESLint + Prettier อัตโนมัติบนไฟล์ที่ staged
หาก ESLint พบปัญหา commit จะถูกยกเลิก
