"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppUser } from "@/lib/auth";

import { EntryForm } from "./EntryForm";
import type { EntryWithRelations } from "./types";

type TaxonomyOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "INCOME" | "EXPENSE";
  entry: EntryWithRelations | null;
  branches: TaxonomyOption[];
  expenseSources: TaxonomyOption[];
  paymentMethods: TaxonomyOption[];
  bookingChannels: TaxonomyOption[];
  carBrands: TaxonomyOption[];
  productTypes: TaxonomyOption[];
  products: TaxonomyOption[];
  lockedMonths: string[];
  currentUser: AppUser;
};

export function EntryModal({
  open,
  onOpenChange,
  type,
  entry,
  branches,
  expenseSources,
  paymentMethods,
  bookingChannels,
  carBrands,
  productTypes,
  products,
  lockedMonths,
  currentUser,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "แก้ไขรายการ" : "เพิ่มรายการ"}</DialogTitle>
          {entry && (entry.createdBy || entry.updatedBy) && (
            <DialogDescription>
              {entry.createdBy && <>ผู้บันทึก: {entry.createdBy.displayName}</>}
              {entry.updatedBy && entry.updatedBy.displayName !== entry.createdBy?.displayName && (
                <> · แก้ไขล่าสุดโดย: {entry.updatedBy.displayName}</>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        <EntryForm
          type={type}
          entry={entry}
          branches={branches}
          expenseSources={expenseSources}
          paymentMethods={paymentMethods}
          bookingChannels={bookingChannels}
          carBrands={carBrands}
          productTypes={productTypes}
          products={products}
          lockedMonths={lockedMonths}
          currentUser={currentUser}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
