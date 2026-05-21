import type { Entry, FileKind } from "@prisma/client";

export type EntryFileLite = {
  id: string;
  kind: FileKind;
  originalName: string;
  sizeBytes: number | null;
  mimeType: string | null;
};

export type EntryWithRelations = Entry & {
  branch: { name: string };
  expenseSource?: { name: string } | null;
  createdBy?: { displayName: string } | null;
  updatedBy?: { displayName: string } | null;
  files?: EntryFileLite[];
};
