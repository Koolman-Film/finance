import type { Entry } from "@prisma/client";

export type EntryWithRelations = Entry & {
  branch: { name: string };
  expenseSource?: { name: string } | null;
  createdBy?: { displayName: string } | null;
  updatedBy?: { displayName: string } | null;
};
