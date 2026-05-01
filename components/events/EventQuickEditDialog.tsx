"use client";

import { useEffect, useState } from "react";
import type { EventStatus } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES: EventStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REPORTED",
  "OVERDUE",
  "CANCELLED",
];

export type EventQuickEditTarget = {
  id: string;
  status: EventStatus;
  notes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EventQuickEditTarget | null;
  /** i18n labels for each status */
  statusLabel: (s: EventStatus) => string;
  dialogTitle: string;
  statusFieldLabel: string;
  labelNotes: string;
  placeholderNotes: string;
  saveLabel: string;
  cancelLabel: string;
  savingLabel: string;
  saveFailedLabel: string;
  onSaved: () => void;
};

export function EventQuickEditDialog(props: Props): JSX.Element {
  const {
    open,
    onOpenChange,
    target,
    statusLabel,
    dialogTitle,
    statusFieldLabel,
    labelNotes,
    placeholderNotes,
    saveLabel,
    cancelLabel,
    savingLabel,
    saveFailedLabel,
    onSaved,
  } = props;

  const [status, setStatus] = useState<EventStatus>("PENDING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setStatus(target.status);
    setNotes(target.notes ?? "");
  }, [target]);

  async function save(): Promise<void> {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${target.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        alert(saveFailedLabel);
        return;
      }
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        {target ? (
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{statusFieldLabel}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
                <SelectTrigger className="h-11 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{labelNotes}</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-gold/40"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={placeholderNotes}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" disabled={saving || !target} onClick={() => void save()}>
            {saving ? savingLabel : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
