import type { Entry, FileKind } from "@prisma/client";

export type EntryFileLite = {
  id: string;
  kind: FileKind;
  originalName: string;
  sizeBytes: number | null;
  mimeType: string | null;
};

/// Wire-safe shape: Prisma's Decimal class can't cross the server -> client
/// boundary (Next.js serializer rejects non-plain objects), so we substitute
/// `number` for `amount`, `bookedPrice`, and `soldPrice`. Pages call
/// `toClientEntry` below before passing rows to client components.
export type EntryWithRelations = Omit<Entry, "amount" | "bookedPrice" | "soldPrice"> & {
  amount: number;
  bookedPrice: number | null;
  soldPrice: number | null;
  branch: { name: string };
  expenseSource?: { name: string } | null;
  createdBy?: { displayName: string } | null;
  updatedBy?: { displayName: string } | null;
  files?: EntryFileLite[];
};

/// Convert a Prisma entry row (or any object with the three Decimal price
/// fields) into a plain-object shape safe to pass into a client component.
export function toClientEntry<
  T extends {
    amount: { toString(): string };
    bookedPrice: { toString(): string } | null;
    soldPrice: { toString(): string } | null;
  },
>(
  e: T,
): Omit<T, "amount" | "bookedPrice" | "soldPrice"> & {
  amount: number;
  bookedPrice: number | null;
  soldPrice: number | null;
} {
  return {
    ...e,
    amount: Number(e.amount),
    bookedPrice: e.bookedPrice == null ? null : Number(e.bookedPrice),
    soldPrice: e.soldPrice == null ? null : Number(e.soldPrice),
  };
}
