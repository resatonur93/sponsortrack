"use client";

import { useEffect, useState } from "react";
import type { PolicyCategory } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/LanguageContext";

const CATEGORIES: PolicyCategory[] = [
  "SPONSOR_DUTIES",
  "IMMIGRATION_RULES",
  "COMPLIANCE_GUIDANCE",
  "DATA_PROTECTION",
  "EMPLOYMENT_LAW",
  "TRAINING_MATERIAL",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function PolicyUploadDialog(props: Props): JSX.Element {
  const { open, onOpenChange, onCreated } = props;
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [category, setCategory] = useState<PolicyCategory>("COMPLIANCE_GUIDANCE");
  const [mandatory, setMandatory] = useState(false);
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setVersion("1.0");
    setEffectiveDate("");
    setCategory("COMPLIANCE_GUIDANCE");
    setMandatory(false);
    setContent("");
    setFileUrl("");
    setSaving(false);
  }, [open]);

  async function submit(): Promise<void> {
    if (!effectiveDate.trim()) return;
    if (!content.trim() && !fileUrl.trim()) {
      window.alert(t("policies.uploadNeedsBodyOrLink"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          version: version.trim() || "1.0",
          effectiveDate,
          category,
          isAcknowledgementRequired: mandatory,
          fileUrl: fileUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        window.alert(t("policies.uploadFailed"));
        return;
      }
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("policies.uploadTitle")}</DialogTitle>
          <p className="text-sm text-slate-600">{t("policies.uploadHint")}</p>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t("policies.fieldTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label>{t("policies.fieldVersion")}</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label>{t("policies.fieldEffective")}</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t("policies.fieldCategory")}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PolicyCategory)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`policies.cat.${c}`, c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <input
              id="pol-mandatory"
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="h-4 w-4 accent-brand-navy"
            />
            <label htmlFor="pol-mandatory" className="text-sm text-slate-800">
              {t("policies.fieldMandatory")}
            </label>
          </div>
          <div className="grid gap-2">
            <Label>{t("policies.fieldContent")}</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-gold/40"
              placeholder={t("policies.fieldContentPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("policies.fieldFileUrl")}</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="h-11 font-mono text-xs"
            />
            <p className="text-xs text-slate-500">{t("policies.fieldFileUrlHint")}</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={saving || !title.trim() || !effectiveDate}
            onClick={() => void submit()}
          >
            {saving ? t("policies.uploadSaving") : t("policies.uploadSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
