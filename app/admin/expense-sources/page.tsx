import {
  createExpenseSource,
  renameExpenseSource,
  toggleExpenseSourceActive,
} from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function ExpenseSourcesPage() {
  const sources = await prisma.expenseSource.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="แหล่งจ่ายเงิน"
      inputLabel="ชื่อแหล่งจ่ายเงินใหม่"
      items={sources}
      createAction={createExpenseSource}
      renameAction={renameExpenseSource}
      toggleActiveAction={toggleExpenseSourceActive}
    />
  );
}
