"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/admin-actions";

const IDLE: ActionResult = { ok: false, error: "" };

type Item = { id: string; name: string; active: boolean };

type Props = {
  title: string;
  inputLabel: string;
  items: Item[];
  createAction: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  renameAction: (id: string, name: string) => Promise<ActionResult>;
  toggleActiveAction: (id: string, active: boolean) => Promise<ActionResult>;
};

export function TaxonomyManager({
  title,
  inputLabel,
  items,
  createAction,
  renameAction,
  toggleActiveAction,
}: Props) {
  const [createState, createFormAction, createPending] = useActionState(createAction, IDLE);

  // Reset the add form after a successful create. useActionState has no
  // post-success callback in React 19, so a lifecycle effect is the documented
  // pattern; the lint rule below is overly strict for this case.
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (createState && "ok" in createState && createState.ok)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);
  }, [createState]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>

        <form
          key={formKey}
          action={createFormAction}
          className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-name">{inputLabel}</Label>
            <Input id="new-name" name="name" required maxLength={100} />
          </div>
          <Button type="submit" disabled={createPending}>
            {createPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            เพิ่ม
          </Button>
        </form>

        {createState && "ok" in createState && !createState.ok && createState.error && (
          <p className="text-destructive mt-2 flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            {createState.error}
          </p>
        )}
      </section>

      <ul className="divide-y rounded-lg border">
        {items.map((it) => (
          <Row
            key={it.id}
            item={it}
            renameAction={renameAction}
            toggleActiveAction={toggleActiveAction}
          />
        ))}
        {items.length === 0 && (
          <li className="text-muted-foreground p-4 text-center text-sm">ยังไม่มีรายการ</li>
        )}
      </ul>
    </div>
  );
}

function Row({
  item,
  renameAction,
  toggleActiveAction,
}: {
  item: Item;
  renameAction: (id: string, name: string) => Promise<ActionResult>;
  toggleActiveAction: (id: string, active: boolean) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await renameAction(item.id, name);
      if (!res.ok) {
        setError(res.error);
      } else {
        setEditing(false);
      }
    });
  }

  function toggle() {
    startTransition(async () => {
      await toggleActiveAction(item.id, !item.active);
    });
  }

  return (
    <li className="flex items-center gap-3 p-3">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            disabled={pending}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setName(item.name);
                setEditing(false);
                setError(null);
              }
            }}
          />
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setName(item.name);
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
          >
            <X className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <span className={`flex-1 ${item.active ? "" : "text-muted-foreground line-through"}`}>
            {item.name}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={item.active ? "secondary" : "outline"}
            onClick={toggle}
            disabled={pending}
          >
            {item.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </Button>
        </>
      )}
      {error && (
        <p className="text-destructive ml-2 flex items-center gap-1 text-xs">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </li>
  );
}
