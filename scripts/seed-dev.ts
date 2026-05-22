// Mock dataset for local development.
//
// Generates realistic Thai car-film-shop entries for each branch across every
// month of the current year up to today, plus a recurring set of expenses.
// Run after `npm run seed` (which creates the branches + sources + admin).
//
//   npm run seed:dev               # adds ~300 entries to whatever's there
//   npm run seed:dev -- --reset    # wipes existing entries first
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMERS: ReadonlyArray<{
  name: string;
  tel: string;
  brand: string;
  model: string;
  license: string;
}> = [
  {
    name: "คุณสมชาย ใจดี",
    tel: "081-234-5678",
    brand: "Toyota",
    model: "Camry 2.5G สีดำ",
    license: "1กข-1234 เชียงใหม่",
  },
  {
    name: "คุณสมหญิง รักดี",
    tel: "089-876-5432",
    brand: "Honda",
    model: "Civic RS สีขาวมุก",
    license: "ภต-5678 เชียงใหม่",
  },
  {
    name: "คุณวิภา สุขใจ",
    tel: "082-111-2233",
    brand: "Mazda",
    model: "Mazda 2 Skyactiv สีแดง",
    license: "กง-9012 ลำพูน",
  },
  {
    name: "คุณอภิชาติ ทองคำ",
    tel: "086-444-5566",
    brand: "Isuzu",
    model: "D-Max V-Cross สีเทา",
    license: "บค-3344 ลำปาง",
  },
  {
    name: "คุณนภาพร แสงทอง",
    tel: "098-222-7788",
    brand: "Toyota",
    model: "Yaris Ativ สีน้ำเงิน",
    license: "ขท-5566 พะเยา",
  },
  {
    name: "คุณกิตติ ศรีสวัสดิ์",
    tel: "081-555-9900",
    brand: "Honda",
    model: "CR-V Hybrid สีเงิน",
    license: "1ขค-7788 เชียงใหม่",
  },
  {
    name: "คุณมาลี ใจงาม",
    tel: "089-333-1122",
    brand: "Mitsubishi",
    model: "Triton Athlete สีดำ",
    license: "งจ-2233 ลำพูน",
  },
  {
    name: "คุณสมศักดิ์ ทองดี",
    tel: "086-777-4455",
    brand: "Nissan",
    model: "Almera สีขาว",
    license: "ดต-6677 ลำปาง",
  },
  {
    name: "คุณปราณี รุ่งโรจน์",
    tel: "082-666-8899",
    brand: "Toyota",
    model: "Fortuner Legender สีเทาเข้ม",
    license: "ผษ-1100 พะเยา",
  },
  {
    name: "คุณวีระ สังข์ทอง",
    tel: "098-555-3344",
    brand: "Ford",
    model: "Ranger Wildtrak สีส้ม",
    license: "1ฉช-4422 เชียงใหม่",
  },
  {
    name: "คุณสุนีย์ พรหมศรี",
    tel: "081-888-2244",
    brand: "MG",
    model: "MG ZS EV สีน้ำเงิน",
    license: "ฌญ-9988 เชียงใหม่",
  },
  {
    name: "คุณบุญชู มั่นคง",
    tel: "089-111-5577",
    brand: "Toyota",
    model: "Hilux Revo สีเทา",
    license: "ฎฏ-3311 ลำพูน",
  },
  {
    name: "คุณรัตนา จันทร์เพ็ญ",
    tel: "086-222-6688",
    brand: "Honda",
    model: "City e:HEV สีขาว",
    license: "ฐฑ-7755 ลำปาง",
  },
  {
    name: "คุณประยุทธ์ ดวงดี",
    tel: "082-444-9911",
    brand: "BYD",
    model: "BYD Atto 3 สีฟ้า",
    license: "ฒณ-4488 พะเยา",
  },
  {
    name: "คุณอรุณ ฟ้าใส",
    tel: "098-666-1133",
    brand: "Tesla",
    model: "Model Y สีขาวมุก",
    license: "1ดต-5544 เชียงใหม่",
  },
  {
    name: "คุณวรรณา สุขสันต์",
    tel: "081-999-7766",
    brand: "Suzuki",
    model: "Swift สีเขียว",
    license: "ถท-2299 เชียงใหม่",
  },
  {
    name: "คุณเกษม ใจกล้า",
    tel: "089-555-4422",
    brand: "Toyota",
    model: "Vios สีแดง",
    license: "ธน-8866 ลำพูน",
  },
  {
    name: "คุณพิมพ์ใจ บุญมา",
    tel: "086-888-3311",
    brand: "Honda",
    model: "HR-V สีดำ",
    license: "บป-5500 ลำปาง",
  },
  {
    name: "คุณชาญ ศรีวิชัย",
    tel: "082-777-5599",
    brand: "Mazda",
    model: "CX-30 สีแดงเชอร์รี่",
    license: "ผ ฝ-7733 พะเยา",
  },
  {
    name: "คุณดวงใจ บูรพา",
    tel: "098-444-8800",
    brand: "Toyota",
    model: "Corolla Cross HEV สีเงิน",
    license: "1ภม-2266 เชียงใหม่",
  },
  {
    name: "คุณธนพล ภักดี",
    tel: "081-666-2211",
    brand: "Lexus",
    model: "RX 350h สีดำ",
    license: "ยร-9944 เชียงใหม่",
  },
  {
    name: "คุณวันดี กุลเจริญ",
    tel: "089-222-3355",
    brand: "BMW",
    model: "BMW 320d M Sport สีขาว",
    license: "ลว-1177 เชียงใหม่",
  },
  {
    name: "คุณจรัส แก้วใส",
    tel: "086-555-9922",
    brand: "Mercedes-Benz",
    model: "C-Class สีเทา",
    license: "ศษ-6655 ลำพูน",
  },
  {
    name: "คุณพิศมัย รัตนกร",
    tel: "082-888-4400",
    brand: "Volvo",
    model: "XC60 Recharge สีน้ำเงิน",
    license: "สห-3300 ลำปาง",
  },
  {
    name: "คุณบุญส่ง ทวีทรัพย์",
    tel: "098-111-6699",
    brand: "Subaru",
    model: "Forester สีเงิน",
    license: "อฮ-8811 พะเยา",
  },
];

const BOOKED_VIA = [
  "LINE",
  "Facebook",
  "เพื่อนแนะนำ",
  "Walk-in",
  "เซลล์โทร",
  "Google Maps",
  "TikTok",
] as const;
const PROD_TYPES = [
  "ฟิล์มกรองแสง",
  "ฟิล์มกันรอย PPF",
  "เคลือบแก้ว",
  "ฟิล์มลามิเนตเซรามิก",
] as const;

const FILM_PRODUCTS = [
  { name: "3M Crystalline 70% รอบคัน", basePrice: 22000 },
  { name: "3M Crystalline 40% รอบคัน", basePrice: 18000 },
  { name: "3M FX Premium 60% รอบคัน", basePrice: 12000 },
  { name: "Lamina Infrared 70% รอบคัน", basePrice: 13000 },
  { name: "Lamina Platinum 80% รอบคัน", basePrice: 15500 },
  { name: "V-Kool VK-70 รอบคัน", basePrice: 28000 },
  { name: "Hi-Kool Carbon Pro รอบคัน", basePrice: 9500 },
  { name: "Llumar IRX 70% รอบคัน", basePrice: 14500 },
  { name: "ฟิล์มกันรอย PPF บานหน้า", basePrice: 8500 },
  { name: "ฟิล์มกันรอย PPF รอบคัน", basePrice: 45000 },
  { name: "เคลือบแก้ว Ceramic Pro 9H", basePrice: 12000 },
] as const;

const EXPENSE_CATEGORIES: ReadonlyArray<{ detail: string; min: number; max: number }> = [
  { detail: "ค่าน้ำมันรถส่งของ", min: 500, max: 1500 },
  { detail: "ค่าวัสดุสิ้นเปลือง (แอลกอฮอล์ ผ้าเช็ด ใบมีด)", min: 200, max: 800 },
  { detail: "ค่าอาหารพนักงาน", min: 300, max: 1200 },
  { detail: "ค่าโฆษณา Facebook Ads", min: 500, max: 3000 },
  { detail: "ค่ายิงโพสต์ TikTok", min: 800, max: 2500 },
  { detail: "ค่าซ่อมเครื่องตัดฟิล์ม", min: 1500, max: 5000 },
  { detail: "ค่าไฟฟ้า", min: 1800, max: 4500 },
  { detail: "ค่าน้ำประปา", min: 200, max: 600 },
  { detail: "ค่าอินเทอร์เน็ต", min: 800, max: 1500 },
  { detail: "ค่าอุปกรณ์ทำความสะอาด", min: 300, max: 1000 },
  { detail: "ค่าซื้อกาแฟ-น้ำดื่มต้อนรับลูกค้า", min: 200, max: 700 },
  { detail: "ค่าถ่ายเอกสาร พิมพ์ใบเสร็จ", min: 100, max: 400 },
];

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(base: number, pct: number): number {
  const v = (Math.random() - 0.5) * 2 * pct;
  return Math.round(base * (1 + v));
}

/// Idempotent upsert for a name-keyed taxonomy table. Returns the row id.
async function ensureTaxonomy(
  table:
    | typeof prisma.bookingChannel
    | typeof prisma.carBrand
    | typeof prisma.productType
    | typeof prisma.product,
  name: string,
  sortOrder: number,
): Promise<string> {
  // @ts-expect-error — table.upsert is shared shape across all 5 taxonomy models.
  const row = await table.upsert({
    where: { name },
    update: {},
    create: { name, sortOrder },
    select: { id: true },
  });
  return row.id;
}

async function main() {
  const reset = process.argv.includes("--reset");

  const [branches, sources, paymentMethods, admin] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.expenseSource.findMany({ where: { active: true } }),
    prisma.paymentMethod.findMany({ where: { active: true } }),
    prisma.user.findFirst({ where: { role: "ADMIN", active: true } }),
  ]);

  if (branches.length === 0) {
    console.error('No branches found. Run "npm run seed" first.');
    process.exit(1);
  }
  if (sources.length === 0) {
    console.error('No expense sources found. Run "npm run seed" first.');
    process.exit(1);
  }
  if (paymentMethods.length === 0) {
    console.error('No payment methods found. Run "npx prisma migrate deploy" first.');
    process.exit(1);
  }
  if (!admin) {
    console.error('No admin user found. Run "npm run set-admin -- <email> ..." first.');
    process.exit(1);
  }

  // Ensure the admin-managed taxonomies have entries to assign to seed rows.
  // After the dropdownize migration these tables were already backfilled from
  // existing data; this block makes a clean local dev DB (or production) work
  // out of the box without manual UI clicks.
  const bookingChannelIds = await Promise.all(
    BOOKED_VIA.map((name, i) => ensureTaxonomy(prisma.bookingChannel, name, i)),
  );
  const uniqueBrandNames = Array.from(new Set(CUSTOMERS.map((c) => c.brand)));
  const carBrandIdByName = new Map(
    await Promise.all(
      uniqueBrandNames.map(
        async (n, i) => [n, await ensureTaxonomy(prisma.carBrand, n, i)] as const,
      ),
    ),
  );
  const productTypeIds = await Promise.all(
    PROD_TYPES.map((name, i) => ensureTaxonomy(prisma.productType, name, i)),
  );
  const productIdByName = new Map(
    await Promise.all(
      FILM_PRODUCTS.map(
        async (p, i) => [p.name, await ensureTaxonomy(prisma.product, p.name, i)] as const,
      ),
    ),
  );

  if (reset) {
    const { count } = await prisma.entry.deleteMany({});
    console.log(`Deleted ${count} existing entries.`);
  }

  const now = new Date();
  const year = now.getFullYear();
  const monthsToFill = now.getMonth() + 1; // current year through current month inclusive

  let total = 0;

  for (let m = 0; m < monthsToFill; m++) {
    const yyyyMm = `${year}-${String(m + 1).padStart(2, "0")}`;
    // Cap the day at today's day if we're in the current month, else 28
    // (avoids creating entries dated in the future).
    const maxDay = m === now.getMonth() ? now.getDate() : 28;

    for (const branch of branches) {
      // Income: 8-18 entries per branch per month
      const incomeCount = 8 + Math.floor(Math.random() * 11);
      for (let i = 0; i < incomeCount; i++) {
        const customer = pick(CUSTOMERS);
        const product = pick(FILM_PRODUCTS);
        const day = 1 + Math.floor(Math.random() * maxDay);
        const date = new Date(year, m, day);
        const soldPrice = jitter(product.basePrice, 0.1);
        // Booked price within ±5% of sold (sometimes upsell, sometimes discount)
        const bookedPrice = jitter(soldPrice, 0.05);

        const productId = productIdByName.get(product.name)!;
        await prisma.entry.create({
          data: {
            type: "INCOME",
            branchId: branch.id,
            date,
            yyyyMm,
            amount: soldPrice,
            custName: customer.name,
            custTel: customer.tel,
            license: customer.license,
            bookedPrice,
            soldPrice,
            bookingChannelId: pick(bookingChannelIds),
            carBrandId: carBrandIdByName.get(customer.brand)!,
            carModel: customer.model,
            productTypeId: pick(productTypeIds),
            bookedProductId: productId,
            soldProductId: productId,
            paymentMethodId: pick(paymentMethods).id,
            createdById: admin.id,
            updatedById: admin.id,
          },
        });
        total++;
      }

      // Expense: 4-8 entries per branch per month
      const expenseCount = 4 + Math.floor(Math.random() * 5);
      for (let i = 0; i < expenseCount; i++) {
        const cat = pick(EXPENSE_CATEGORIES);
        const day = 1 + Math.floor(Math.random() * maxDay);
        const date = new Date(year, m, day);
        const amount = cat.min + Math.floor(Math.random() * (cat.max - cat.min));

        await prisma.entry.create({
          data: {
            type: "EXPENSE",
            branchId: branch.id,
            date,
            yyyyMm,
            amount,
            expenseDetail: cat.detail,
            expenseSourceId: pick(sources).id,
            createdById: admin.id,
            updatedById: admin.id,
          },
        });
        total++;
      }
    }
  }

  console.log(
    `Created ${total} entries: ${branches.length} branches × ${monthsToFill} months × ~12-26 entries.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
