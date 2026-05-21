import { createCarModel, renameCarModel, toggleCarModelActive } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function CarModelsPage() {
  const models = await prisma.carModel.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="รุ่นรถ/สีรถ"
      inputLabel="ชื่อรุ่น/สีใหม่"
      items={models}
      createAction={createCarModel}
      renameAction={renameCarModel}
      toggleActiveAction={toggleCarModelActive}
    />
  );
}
