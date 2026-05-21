import { createBranch, renameBranch, toggleBranchActive } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="สาขา"
      inputLabel="ชื่อสาขาใหม่"
      items={branches}
      createAction={createBranch}
      renameAction={renameBranch}
      toggleActiveAction={toggleBranchActive}
    />
  );
}
