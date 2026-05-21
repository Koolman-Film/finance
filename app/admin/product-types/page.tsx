import { createProductType, renameProductType, toggleProductTypeActive } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function ProductTypesPage() {
  const types = await prisma.productType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="ชนิดสินค้า"
      inputLabel="ชื่อชนิดสินค้าใหม่"
      items={types}
      createAction={createProductType}
      renameAction={renameProductType}
      toggleActiveAction={toggleProductTypeActive}
    />
  );
}
