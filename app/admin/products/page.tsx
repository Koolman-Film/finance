import { createProduct, renameProduct, toggleProductActive } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="สินค้า (ใช้ร่วมกันทั้ง 'สินค้าที่จอง' และ 'สินค้าที่ขาย')"
      inputLabel="ชื่อสินค้าใหม่"
      items={products}
      createAction={createProduct}
      renameAction={renameProduct}
      toggleActiveAction={toggleProductActive}
    />
  );
}
