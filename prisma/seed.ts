import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANCHES = ["เชียงใหม่", "ลำพูน", "ลำปาง", "พะเยา"];
const EXPENSE_SOURCES = ["เงินสดย่อย", "เงินสำรองพี่ขาว"];

async function main() {
  for (const [i, name] of BRANCHES.entries()) {
    await prisma.branch.upsert({
      where: { name },
      update: { sortOrder: i, active: true },
      create: { name, sortOrder: i },
    });
  }

  for (const [i, name] of EXPENSE_SOURCES.entries()) {
    await prisma.expenseSource.upsert({
      where: { name },
      update: { sortOrder: i, active: true },
      create: { name, sortOrder: i },
    });
  }

  await prisma.setting.upsert({
    where: { key: "staff_can_edit_others_in_branch" },
    update: {},
    create: { key: "staff_can_edit_others_in_branch", value: "true" },
  });

  console.log("Seeded branches, expense sources, and default settings.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
