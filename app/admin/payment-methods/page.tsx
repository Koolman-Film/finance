import {
  createPaymentMethod,
  renamePaymentMethod,
  togglePaymentMethodActive,
} from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function PaymentMethodsPage() {
  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="ช่องทางการชำระเงิน"
      inputLabel="ชื่อช่องทางใหม่"
      items={methods}
      createAction={createPaymentMethod}
      renameAction={renamePaymentMethod}
      toggleActiveAction={togglePaymentMethodActive}
    />
  );
}
