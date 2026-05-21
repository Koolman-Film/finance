"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone, Search, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchCustomers, type CustomerHit } from "@/lib/customer-search";
import { formatThaiDate } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (hit: CustomerHit) => void;
};

export function CustomerSearchDialog({ open, onOpenChange, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Reset when reopened. Lint rule flags setState-in-effect, but resetting
  // child state in response to a parent-controlled `open` prop is the standard
  // React pattern — there's no derived-state alternative.
  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery("");
      setHits([]);
      setSearched(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  // Debounced search. The setState calls here drive the in-flight UI; the
  // actual hit population happens inside the async callback (which is not
  // flagged by the rule).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 1) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setHits([]);
      setSearched(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await searchCustomers(q);
      setHits(res);
      setLoading(false);
      setSearched(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ค้นหาลูกค้าเก่า</DialogTitle>
          <DialogDescription>
            พิมพ์ชื่อ เบอร์โทร ทะเบียนรถ ยี่ห้อ หรือรุ่นรถ — เลือกผลลัพธ์เพื่อเติมข้อมูลอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ชื่อ / เบอร์ / ทะเบียน / ยี่ห้อ / รุ่น"
            className="pl-9"
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              กำลังค้นหา...
            </div>
          )}

          {!loading && searched && hits.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              ไม่พบลูกค้าที่ตรงกับ &ldquo;{query}&rdquo;
            </p>
          )}

          {!loading && !searched && (
            <p className="text-muted-foreground py-8 text-center text-sm">เริ่มพิมพ์เพื่อค้นหา</p>
          )}

          {!loading && hits.length > 0 && (
            <ul className="divide-y rounded-md border">
              {hits.map((h, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(h);
                      onOpenChange(false);
                    }}
                    className="hover:bg-muted/60 focus-visible:bg-muted/60 w-full px-3 py-2 text-left text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="text-muted-foreground size-4 shrink-0" />
                      <span className="font-medium">{h.custName ?? "—"}</span>
                      {h.custTel && (
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          <Phone className="size-3" />
                          {h.custTel}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 pl-6 text-xs">
                      {[h.carBrandName, h.carModelName].filter(Boolean).join(" · ") || "—"}
                      {h.license && <span> · ทะเบียน {h.license}</span>}
                    </div>
                    <div className="text-muted-foreground mt-0.5 pl-6 text-xs">
                      เคยใช้บริการล่าสุด: {formatThaiDate(h.lastSeenAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
