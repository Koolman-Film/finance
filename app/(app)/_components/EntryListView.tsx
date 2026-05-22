"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AppUser } from "@/lib/auth";

import { EntryModal } from "./EntryModal";
import { EntryTable } from "./EntryTable";
import type { EntryWithRelations } from "./types";

type TaxonomyOption = { id: string; name: string };

type Props = {
  type: "INCOME" | "EXPENSE";
  entries: EntryWithRelations[];
  branches: TaxonomyOption[];
  expenseSources: TaxonomyOption[];
  paymentMethods: TaxonomyOption[];
  bookingChannels: TaxonomyOption[];
  carBrands: TaxonomyOption[];
  productTypes: TaxonomyOption[];
  products: TaxonomyOption[];
  lockedMonths: string[];
  currentUser: AppUser;
  openAction: string | null;
};

export function EntryListView({
  type,
  entries,
  branches,
  expenseSources,
  paymentMethods,
  bookingChannels,
  carBrands,
  productTypes,
  products,
  lockedMonths,
  currentUser,
  openAction,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const editingEntry =
    openAction && openAction !== "new" ? (entries.find((e) => e.id === openAction) ?? null) : null;
  const modalOpen = openAction === "new" || !!editingEntry;

  function openAdd() {
    const next = new URLSearchParams(search.toString());
    next.delete("edit");
    next.set("add", "new");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function closeModal() {
    const next = new URLSearchParams(search.toString());
    next.delete("add");
    next.delete("edit");
    const qs = next.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {type === "INCOME" ? "รายการรายรับ" : "รายการรายจ่าย"}
        </h2>
        <Button onClick={openAdd}>
          <Plus className="size-4" /> เพิ่มรายการ
        </Button>
      </div>

      <EntryTable type={type} entries={entries} lockedMonths={new Set(lockedMonths)} />

      <EntryModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        type={type}
        entry={editingEntry}
        branches={branches}
        expenseSources={expenseSources}
        paymentMethods={paymentMethods}
        bookingChannels={bookingChannels}
        carBrands={carBrands}
        productTypes={productTypes}
        products={products}
        lockedMonths={lockedMonths}
        currentUser={currentUser}
      />
    </>
  );
}
