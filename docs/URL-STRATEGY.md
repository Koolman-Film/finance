# URL Strategy ของระบบในเครือ kool-man.com

> สั้นๆ: แต่ละระบบจะอยู่บน subdomain ของตัวเอง

## ผังการตั้งชื่อ (ปัจจุบัน + แผนอนาคต)

| URL                    | ระบบ                                           | สถานะ                                  |
| ---------------------- | ---------------------------------------------- | -------------------------------------- |
| `kool-man.com`         | หน้าแรกของเครือ / launcher                     | ยังไม่มี (ปัจจุบัน redirect → finance) |
| `finance.kool-man.com` | **ระบบรายรับ-รายจ่าย (ที่อยู่ในซอฟต์แวร์นี้)** | ✅ Production                          |
| `pos.kool-man.com`     | POS หน้าร้าน                                   | แผนอนาคต                               |
| `crm.kool-man.com`     | ฐานข้อมูลลูกค้า / ติดตามการขาย                 | แผนอนาคต                               |
| `booking.kool-man.com` | จองคิวลูกค้า                                   | แผนอนาคต                               |
| `stock.kool-man.com`   | สต๊อกฟิล์ม / วัสดุ                             | แผนอนาคต                               |
| `hr.kool-man.com`      | บุคลากร / เงินเดือน                            | แผนอนาคต                               |
| `auth.kool-man.com`    | Single Sign-On (SSO)                           | ถ้าจำเป็นในอนาคต                       |

## ทำไมเลือก subdomain ต่อระบบ (ไม่ใช่ subdir)

| มุมมอง           | subdomain (`finance.kool-man.com`)     | subdir (`kool-man.com/finance`)         |
| ---------------- | -------------------------------------- | --------------------------------------- |
| Deploy แยก       | ✅ แต่ละระบบเป็น project Vercel เอง    | ❌ ต้องอยู่หลัง proxy/router เดียวกัน   |
| Cookie isolation | ✅ ระบบ A เห็น session ระบบ B ไม่ได้   | ❌ ระบบใดก็อ่าน cookie กันได้           |
| DNS              | ✅ CNAME 1 บรรทัดต่อระบบ               | ❌ ต้องเซ็ต edge function หรือ rewrites |
| ผิดพลาด 1 ระบบ   | ✅ ระบบอื่นยังใช้ได้                   | ❌ ถ้า router/proxy ล่ม → ล่มทั้งหมด    |
| Auth             | ⚠ ต้องเพิ่ม redirect URL ทุก subdomain | ✅ Auth flow เดียว                      |

สำหรับธุรกิจที่มี **หลายระบบที่ค่อนข้างอิสระจากกัน** (เช่น finance/POS/CRM ของเรา)
subdomain ชนะแทบทุกด้าน

## แบบอย่างจากบริษัทใหญ่ที่ใช้แบบเดียวกัน

- **Google**: `mail.google.com`, `docs.google.com`, `calendar.google.com`
- **Microsoft 365**: `teams.microsoft.com`, `outlook.office.com`
- **Atlassian**: `<workspace>.atlassian.net/jira/...` (hybrid)

## กฎสำหรับการเพิ่มระบบใหม่

1. ใช้ชื่อ subdomain ที่อธิบายตัวเองได้ (เป็นภาษาอังกฤษ พิมพ์ง่าย)
2. ห้ามใช้ subdomain ที่กว้างเกิน (เช่น `app.`, `web.`) เพราะใช้ได้แค่ระบบเดียว
3. หลีกเลี่ยงการใส่ชื่อแบรนด์ลงใน subdomain (มีในโดเมนหลักอยู่แล้ว เช่น
   `finnix.kool-man.com` พูดซ้ำ)
4. ใส่ subdomain ใหม่ลงในตารางนี้ทุกครั้งที่เพิ่ม

## SSO (ในอนาคต)

หากมีระบบมากกว่า 3 ระบบและเริ่มน่ารำคาญที่ต้อง login แยก:

1. สร้าง `auth.kool-man.com` (Supabase project เดียว)
2. ทุกระบบ redirect ไป `auth.kool-man.com` เพื่อ sign in
3. ใช้ cookie domain `.kool-man.com` (มี dot นำหน้า) เพื่อให้ session ส่งกัน
   ข้าม subdomain ได้

ตอนนี้ระบบเดียว — ไม่ต้องทำ
