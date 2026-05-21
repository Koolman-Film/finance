import { createCarBrand, renameCarBrand, toggleCarBrandActive } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function CarBrandsPage() {
  const brands = await prisma.carBrand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="ยี่ห้อรถ"
      inputLabel="ชื่อยี่ห้อใหม่"
      items={brands}
      createAction={createCarBrand}
      renameAction={renameCarBrand}
      toggleActiveAction={toggleCarBrandActive}
    />
  );
}
