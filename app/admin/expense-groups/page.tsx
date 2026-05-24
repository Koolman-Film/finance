import {
  createExpenseGroup,
  renameExpenseGroup,
  toggleExpenseGroupActive,
} from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function ExpenseGroupsPage() {
  const groups = await prisma.expenseGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="กลุ่มค่าใช้จ่าย"
      inputLabel="ชื่อกลุ่มค่าใช้จ่ายใหม่ (เช่น ค่าน้ำมัน, ค่าวัสดุ)"
      items={groups}
      createAction={createExpenseGroup}
      renameAction={renameExpenseGroup}
      toggleActiveAction={toggleExpenseGroupActive}
    />
  );
}
