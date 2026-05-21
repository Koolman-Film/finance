# Finnix Film — inout (ระบบจัดการรายรับ-รายจ่าย)

ระบบบันทึกรายรับ-รายจ่ายของกิจการ Finnix Film แบบใช้งานออนไลน์หลายคน
พร้อมระบบสิทธิ์ผู้ใช้งาน (Admin / Staff สาขา) และระบบล็อคข้อมูลรายเดือน

> **เวอร์ชันปัจจุบัน:** v0.5 — มีระบบสมาชิก, การกรอกรายรับ-รายจ่าย, การกรองตามสาขาและเดือน, การจำกัดสิทธิ์ตามสาขา
> **ที่จะเพิ่มในเวอร์ชันถัดไป:** หน้าผู้ดูแลระบบ (จัดการสาขา/ผู้ใช้/แหล่งจ่ายเงิน), ล็อคข้อมูลรายเดือนผ่าน UI, แนบไฟล์, ส่งออก Excel/PDF

---

## เครื่องมือพัฒนา (อัตโนมัติเมื่อ commit)

ทุกครั้งที่ `git commit` ระบบจะรัน ESLint + Prettier ให้กับไฟล์ที่ staged ไว้โดยอัตโนมัติ
(ผ่าน Husky + lint-staged) ดังนั้นโค้ดในระบบจะอยู่ในรูปแบบเดียวกันเสมอ
หากตรวจพบข้อผิดพลาด commit จะถูกยกเลิกพร้อมข้อความบอกสาเหตุ

คำสั่งทดสอบที่ใช้ได้ตลอด:

```bash
npm run typecheck   # ตรวจสอบ TypeScript
npx eslint .        # ตรวจสอบ ESLint
npm run format      # จัดรูปแบบโค้ดทุกไฟล์
```

## เทคโนโลยีที่ใช้

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Postgres** ผ่าน **Supabase** (Database + Auth + Storage)
- **Prisma** ORM
- Deploy บน **Vercel**

---

## ขั้นตอนการติดตั้งบนเครื่องสำหรับทดสอบ

### 1) เตรียมโปรเจกต์บน Supabase

1. ไปที่ <https://supabase.com> สมัครบัญชี (ฟรี)
2. กด **New project** ตั้งชื่อ เช่น `finnix-inout` ตั้งรหัสฐานข้อมูล (จดเก็บไว้)
3. รอประมาณ 2 นาทีให้โปรเจกต์พร้อม

### 2) คัดลอกข้อมูลเชื่อมต่อ

ในหน้าโปรเจกต์ Supabase ของคุณ:

- ไปที่ **Project Settings → API** คัดลอก:
  - `Project URL` → ใส่ใน `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → ใส่ใน `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → ใส่ใน `SUPABASE_SERVICE_ROLE_KEY` (เก็บเป็นความลับ)
- ไปที่ **Project Settings → Database → Connection string** เลือก **URI**:
  - แท็บ **Transaction (port 6543)** → ใส่ใน `DATABASE_URL` (ต่อท้ายด้วย `?pgbouncer=true`)
  - แท็บ **Session (port 5432)** → ใส่ใน `DIRECT_URL`

### 3) ตั้งค่าไฟล์ env บนเครื่อง

```bash
cp .env.example .env
# แก้ไขไฟล์ .env ใส่ค่าจริงทั้ง 5 ค่า
```

### 4) ติดตั้ง dependencies และสร้างตาราง

```bash
npm install
npx prisma migrate dev --name init
npm run seed       # สร้าง 4 สาขา + 2 แหล่งจ่ายเงินตั้งต้น
```

### 5) สร้างผู้ดูแลระบบคนแรก

ในหน้า Supabase: **Authentication → Users → Add user**

- กรอกอีเมลกับรหัสผ่านที่ต้องการใช้เป็น admin
- กด **Auto Confirm User** ✓

จากนั้นที่เครื่อง:

```bash
npm run set-admin -- admin@example.com "ชื่อผู้ดูแล"
```

### 6) รันแอปพลิเคชัน

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ <http://localhost:3000> แล้วเข้าสู่ระบบด้วยอีเมล/รหัสที่สร้างไว้

---

## การสร้างผู้ใช้สาขา (Staff)

1. ใน Supabase Dashboard → **Authentication → Users → Add user** สร้างบัญชีพนักงาน
2. รัน SQL ใน **SQL Editor** เพื่อบันทึกเข้าตาราง users ของเรา (หน้า Admin จะมาในเวอร์ชันถัดไป):

   ```sql
   INSERT INTO users (id, email, "displayName", role, "branchId", active, "updatedAt")
   VALUES (
     '<uuid-ของ-supabase-auth-user>',
     'staff@example.com',
     'ชื่อพนักงาน',
     'STAFF',
     (SELECT id FROM branches WHERE name = 'เชียงใหม่'),
     true,
     now()
   );
   ```

> เวอร์ชันถัดไป (v1) จะมีหน้า `/admin/users` ให้สร้างผู้ใช้พร้อมกำหนดสาขาได้ทาง UI

---

## การ Deploy ขึ้น Vercel

1. push โค้ดขึ้น GitHub
2. ที่ <https://vercel.com> เลือก **Import Project** ชี้ไปที่ repo นี้
3. ตั้งค่า **Environment Variables** ทั้ง 5 ตัวจากไฟล์ `.env` ของคุณ
4. กด **Deploy**

หลัง deploy ครั้งแรก ให้รันคำสั่งเดียวที่เครื่องเพื่อ migrate ฐานข้อมูล production:

```bash
npm run prisma:deploy
```

---

## โครงสร้างของโค้ดที่ควรรู้

```
app/
  layout.tsx                — Root layout
  page.tsx                   — เปลี่ยนเส้นทางไปยัง /summary
  login/                     — หน้าเข้าสู่ระบบ
  logout/                    — endpoint ออกจากระบบ
  (app)/                     — กลุ่มเส้นทางที่ต้อง login ก่อน
    layout.tsx               — header + tabs + filter
    summary/page.tsx         — หน้าสรุปยอดรวม
    income/page.tsx          — รายการรายรับ
    expense/page.tsx         — รายการรายจ่าย
    _components/             — Tabs, FilterBar, EntryTable, EntryModal, EntryForm
lib/
  auth.ts                    — getCurrentUser / requireUser / requireAdmin
  branch-scope.ts            — บังคับให้ staff เห็นเฉพาะสาขาของตัวเอง
  entry-actions.ts           — Server Actions สำหรับเพิ่ม/แก้ไข/ลบรายการ
  filters.ts                 — แปลง query string เป็น filter
  format.ts                  — แสดงวันที่ พ.ศ. + เลขเงิน
  prisma.ts                  — Prisma client singleton
  supabase/                  — Supabase server/client/middleware helpers
middleware.ts                — บังคับ session refresh + redirect ไป /login
prisma/
  schema.prisma              — โครงสร้างฐานข้อมูล
  seed.ts                    — สร้างสาขา + แหล่งจ่ายเงินตั้งต้น
scripts/
  set-admin.ts               — ตั้งให้ user คนหนึ่งเป็น ADMIN
reference.html               — ไฟล์อ้างอิงต้นแบบจาก Gemini (เก็บไว้เป็น reference)
```
