"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Layers,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminSurfaceCard } from "@/components/admin/shell/AdminPageShell";
import { useTranslation } from "@/contexts/LanguageContext";
import type { LeadFormFieldKey } from "@/lib/lead-form/field-keys";
import type {
  LeadFieldValidation,
  LeadFormConfigDTO,
  LeadFormFieldDTO,
  LeadFormSourceDTO,
} from "@/lib/lead-form/types";
import { cn } from "@/lib/utils";

function SortableChrome(props: {
  id: string;
  children: (handleProps: Record<string, unknown>) => React.ReactNode;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-brand-navy/10 bg-white/90 shadow-sm ring-1 ring-brand-navy/5",
        isDragging && "z-50 opacity-90 shadow-lg ring-brand-navy/20"
      )}
    >
      {props.children({ ...attributes, ...listeners })}
    </div>
  );
}

export function LeadFormSettingsPanel(): JSX.Element {
  const { t } = useTranslation();
  const formId = useId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<"ok" | "err" | null>(null);
  const [saveDetail, setSaveDetail] = useState<string | null>(null);

  const [fields, setFields] = useState<LeadFormFieldDTO[]>([]);
  const [sources, setSources] = useState<LeadFormSourceDTO[]>([]);
  const [selectedKey, setSelectedKey] = useState<LeadFormFieldKey | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lead-form-config", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: LeadFormConfigDTO;
      };
      if (!res.ok || !json.data) {
        setError(t("admin.settings.leadForm.loadError"));
        return;
      }
      const list = [...json.data.fields].sort((a, b) => a.sortOrder - b.sortOrder);
      setFields(list);
      setSources([...json.data.sources].sort((a, b) => a.sortOrder - b.sortOrder));
      setSelectedKey((k) =>
        k && list.some((f) => f.fieldKey === k) ? k : list[0]?.fieldKey ?? null
      );
    } catch {
      setError(t("admin.settings.leadForm.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const selectedField = useMemo(
    () => fields.find((f) => f.fieldKey === selectedKey) ?? null,
    [fields, selectedKey]
  );

  const onFieldsDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = fields.map((f) => f.fieldKey);
    const oldIndex = ids.indexOf(active.id as LeadFormFieldKey);
    const newIndex = ids.indexOf(over.id as LeadFormFieldKey);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
      ...f,
      sortOrder: i,
    }));
    setFields(moved);
    setSaveBanner(null);
  };

  const onSourcesDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const aid = String(active.id);
    const oid = String(over.id);
    if (!aid.startsWith("src-") || !oid.startsWith("src-")) return;
    const oldIndex = parseInt(aid.slice(4), 10);
    const newIndex = parseInt(oid.slice(4), 10);
    if (
      Number.isNaN(oldIndex) ||
      Number.isNaN(newIndex) ||
      oldIndex < 0 ||
      newIndex < 0
    ) {
      return;
    }
    const moved = arrayMove(sources, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i,
    }));
    setSources(moved);
    setSaveBanner(null);
  };

  const patchSelected = (partial: Partial<LeadFormFieldDTO>): void => {
    if (!selectedField) return;
    setFields((prev) =>
      prev.map((f) =>
        f.fieldKey === selectedField.fieldKey ? { ...f, ...partial } : f
      )
    );
    setSaveBanner(null);
  };

  const patchValidation = (partial: Partial<LeadFieldValidation>): void => {
    if (!selectedField) return;
    const base = { ...(selectedField.validation ?? {}) };
    const next = { ...base, ...partial };
    for (const k of Object.keys(next) as (keyof LeadFieldValidation)[]) {
      if (next[k] === undefined) delete next[k];
    }
    patchSelected({
      validation: Object.keys(next).length ? (next as LeadFieldValidation) : null,
    });
  };

  async function save(): Promise<void> {
    setSaving(true);
    setSaveBanner(null);
    setSaveDetail(null);
    try {
      const res = await fetch("/api/admin/lead-form-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: [...fields].sort((a, b) => a.sortOrder - b.sortOrder),
          sources: [...sources].sort((a, b) => a.sortOrder - b.sortOrder),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSaveBanner("err");
        setSaveDetail(json.error ?? `${res.status}`);
        return;
      }
      setSaveBanner("ok");
      await loadConfig();
    } catch {
      setSaveBanner("err");
      setSaveDetail("network");
    } finally {
      setSaving(false);
    }
  }

  function addSource(): void {
    const n =
      sources.length === 0
        ? 0
        : Math.max(...sources.map((s) => s.sortOrder), 0) + 1;
    setSources([
      ...sources,
      {
        sortOrder: n,
        value: "",
        label: "",
        isActive: true,
      },
    ]);
    setSaveBanner(null);
  }

  function removeSourceAt(index: number): void {
    if (sources.length <= 1) return;
    const next = sources.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      sortOrder: i,
    }));
    setSources(next);
    setSaveBanner(null);
  }

  if (loading) {
    return (
      <AdminSurfaceCard className="flex items-center gap-3 p-8 text-brand-slate">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        {t("common.loading")}
      </AdminSurfaceCard>
    );
  }

  if (error) {
    return (
      <AdminSurfaceCard className="space-y-4 p-8">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <Button type="button" variant="outline" onClick={() => void loadConfig()}>
          {t("common.retry")}
        </Button>
      </AdminSurfaceCard>
    );
  }

  return (
    <AdminSurfaceCard className="space-y-8 p-6 md:p-8">
      <div className="flex flex-col gap-4 border-b border-brand-navy/10 pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/15">
            <Layers className="h-7 w-7" aria-hidden strokeWidth={1.75} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-brand-navy">
              {t("admin.settings.leadForm.title")}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-brand-slate">
              {t("admin.settings.leadForm.subtitle")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-brand-navy font-bold hover:bg-brand-navy/92"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              {t("admin.settings.leadForm.saving")}
            </>
          ) : (
            t("admin.settings.leadForm.save")
          )}
        </Button>
      </div>

      {saveBanner === "ok" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {t("admin.settings.leadForm.saved")}
        </p>
      ) : null}
      {saveBanner === "err" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {t("admin.settings.leadForm.saveError")}
          {saveDetail ? ` (${saveDetail})` : ""}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-slate">
            {t("admin.settings.leadForm.fieldsTitle")}
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onFieldsDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.fieldKey)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {fields.map((f) => (
                  <li key={f.fieldKey}>
                    <SortableChrome id={f.fieldKey}>
                      {(handle) => (
                        <button
                          type="button"
                          onClick={() => setSelectedKey(f.fieldKey)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                            selectedKey === f.fieldKey
                              ? "bg-brand-gold/15 ring-2 ring-brand-gold/35"
                              : "hover:bg-brand-navy/[0.04]"
                          )}
                        >
                          <span
                            className="inline-flex shrink-0 touch-none rounded-md p-1.5 text-brand-slate hover:bg-brand-navy/10 hover:text-brand-navy"
                            {...handle}
                            aria-label={t("admin.settings.leadForm.reorder")}
                          >
                            <GripVertical className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-brand-navy">
                              {t(`admin.settings.leadForm.key.${f.fieldKey}`)}
                            </p>
                            <p className="truncate text-xs text-brand-slate">{f.label}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              f.enabled
                                ? "border-emerald-400/70 bg-emerald-50 text-emerald-950"
                                : "border-brand-navy/20 bg-brand-navy/5 text-brand-slate"
                            }
                          >
                            {f.enabled
                              ? t("admin.settings.leadForm.visible")
                              : t("admin.settings.leadForm.hidden")}
                          </Badge>
                        </button>
                      )}
                    </SortableChrome>
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-4 lg:border-l lg:border-brand-navy/10 lg:pl-8">
          {selectedField ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-slate">
                {t("admin.settings.leadForm.fieldEditor")}
              </p>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-label`} className="text-brand-navy">
                  {t("admin.settings.leadForm.label")}
                </Label>
                <Input
                  id={`${formId}-label`}
                  value={selectedField.label}
                  onChange={(e) =>
                    patchSelected({
                      label: e.target.value,
                    })
                  }
                  className="border-brand-navy/15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-ph`} className="text-brand-navy">
                  {t("admin.settings.leadForm.placeholder")}
                </Label>
                <Input
                  id={`${formId}-ph`}
                  value={selectedField.placeholder ?? ""}
                  onChange={(e) =>
                    patchSelected({
                      placeholder: e.target.value || null,
                    })
                  }
                  className="border-brand-navy/15"
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-navy">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-navy/30"
                    checked={selectedField.enabled}
                    disabled={
                      selectedField.fieldKey === "email" ||
                      selectedField.fieldKey === "source"
                    }
                    onChange={(e) => patchSelected({ enabled: e.target.checked })}
                  />
                  {t("admin.settings.leadForm.fieldEnabled")}
                  {(selectedField.fieldKey === "email" ||
                    selectedField.fieldKey === "source") && (
                    <span className="text-xs font-medium text-brand-slate">
                      ({t("admin.settings.leadForm.lockedToggle")})
                    </span>
                  )}
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-navy">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-navy/30"
                    checked={selectedField.required}
                    disabled={selectedField.fieldKey === "email"}
                    onChange={(e) =>
                      patchSelected({ required: e.target.checked })
                    }
                  />
                  {t("admin.settings.leadForm.fieldRequired")}
                  {selectedField.fieldKey === "email" ? (
                    <span className="text-xs font-medium text-brand-slate">
                      ({t("admin.settings.leadForm.requiredLockedEmail")})
                    </span>
                  ) : null}
                </label>
              </div>

              <fieldset className="space-y-3 rounded-xl border border-brand-navy/10 bg-brand-navy/[0.02] p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-slate">
                  {t("admin.settings.leadForm.validation")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-brand-navy">
                      {t("admin.settings.leadForm.minLen")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={selectedField.validation?.minLength ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchValidation({
                          minLength: v === "" ? undefined : parseInt(v, 10),
                        });
                      }}
                      className="border-brand-navy/15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-brand-navy">
                      {t("admin.settings.leadForm.maxLen")}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={selectedField.validation?.maxLength ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        patchValidation({
                          maxLength: v === "" ? undefined : parseInt(v, 10),
                        });
                      }}
                      className="border-brand-navy/15"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-brand-navy">
                    {t("admin.settings.leadForm.pattern")}
                  </Label>
                  <Input
                    value={selectedField.validation?.pattern ?? ""}
                    placeholder="^…$"
                    onChange={(e) =>
                      patchValidation({
                        pattern: e.target.value.trim() ? e.target.value : undefined,
                      })
                    }
                    className="border-brand-navy/15 font-mono text-xs"
                  />
                </div>
                {selectedField.fieldKey === "email" ||
                selectedField.fieldKey === "phone" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-brand-navy/30"
                      checked={
                        selectedField.fieldKey === "email"
                          ? Boolean(
                              selectedField.validation?.enforceEmail !== false
                            )
                          : Boolean(selectedField.validation?.phoneIntl)
                      }
                      onChange={(e) => {
                        if (selectedField.fieldKey === "email") {
                          patchValidation({
                            enforceEmail: e.target.checked,
                          });
                        } else {
                          patchValidation({
                            phoneIntl: e.target.checked,
                          });
                        }
                      }}
                    />
                    {selectedField.fieldKey === "email"
                      ? t("admin.settings.leadForm.enforceEmail")
                      : t("admin.settings.leadForm.phoneIntl")}
                  </label>
                ) : null}
              </fieldset>
            </>
          ) : (
            <p className="text-sm text-brand-slate">{t("admin.settings.leadForm.selectField")}</p>
          )}
        </div>
      </div>

      <div className="space-y-4 border-t border-brand-navy/10 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900">
              <Megaphone className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-bold text-brand-navy">
                {t("admin.settings.leadForm.sourcesTitle")}
              </p>
              <p className="text-sm text-brand-slate">
                {t("admin.settings.leadForm.sourcesHint")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-brand-navy/25 font-semibold"
            onClick={addSource}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("admin.settings.leadForm.addSource")}
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onSourcesDragEnd}
        >
          <SortableContext
            items={sources.map((_, i) => `src-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {sources.map((s, idx) => {
                const sid = `src-${idx}`;
                return (
                  <li key={s.id ?? `draft-${idx}`}>
                    <SortableChrome id={sid}>
                      {(handle) => (
                        <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
                          <span
                            className="inline-flex shrink-0 self-start rounded-md p-1.5 text-brand-slate hover:bg-brand-navy/10"
                            {...handle}
                            aria-label={t("admin.settings.leadForm.reorder")}
                          >
                            <GripVertical className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide text-brand-slate">
                                {t("admin.settings.leadForm.sourceSlug")}
                              </Label>
                              <Input
                                value={s.value}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const next = [...sources];
                                  next[idx] = { ...next[idx], value: v };
                                  setSources(next);
                                  setSaveBanner(null);
                                }}
                                placeholder="linkedin"
                                className="border-brand-navy/15 font-mono text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[11px] uppercase tracking-wide text-brand-slate">
                                {t("admin.settings.leadForm.sourceVisible")}
                              </Label>
                              <Input
                                value={s.label}
                                onChange={(e) => {
                                  const next = [...sources];
                                  next[idx] = {
                                    ...next[idx],
                                    label: e.target.value,
                                  };
                                  setSources(next);
                                  setSaveBanner(null);
                                }}
                                className="border-brand-navy/15"
                              />
                            </div>
                          </div>
                          <label className="flex shrink-0 items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-brand-navy/30"
                              checked={s.isActive}
                              onChange={(e) => {
                                const next = [...sources];
                                next[idx] = {
                                  ...next[idx],
                                  isActive: e.target.checked,
                                };
                                setSources(next);
                                setSaveBanner(null);
                              }}
                            />
                            {t("admin.settings.leadForm.sourceActive")}
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={sources.length <= 1}
                            onClick={() => removeSourceAt(idx)}
                            aria-label={t("admin.settings.leadForm.removeSource")}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </SortableChrome>
                  </li>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </AdminSurfaceCard>
  );
}
