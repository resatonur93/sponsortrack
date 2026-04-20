"use client";

import { forwardRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmploymentStatus } from "@prisma/client";
import { workerCreateSchema } from "@/lib/schemas";
import type { z } from "zod";
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

const schema = workerCreateSchema;
type FormValues = z.infer<typeof schema>;

const steps = ["Kişisel", "Vize", "İş", "Özet"] as const;

export function WorkerForm(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nationality: "UK",
      employmentStatus: EmploymentStatus.PENDING_START,
      isOffshoreWorker: false,
      salary: 30000,
    },
  });

  async function onSubmit(values: FormValues): Promise<void> {
    setSubmitError(null);
    const payload = {
      ...values,
      dateOfBirth: values.dateOfBirth || null,
      visaStartDate: values.visaStartDate || null,
      visaExpiryDate: values.visaExpiryDate || null,
      sponsorshipStartDate: values.sponsorshipStartDate || null,
      sponsorshipEndDate: values.sponsorshipEndDate || null,
    };

    const res = await fetch("/api/workers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitError(j.error ?? "Kayıt başarısız");
      return;
    }
    const json = (await res.json()) as { data: { id: string } };
    router.push(`/workers/${json.data.id}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="flex gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              i === step
                ? "bg-brand-navy text-white"
                : "bg-slate-200 text-slate-700"
            }`}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad" {...form.register("firstName")} required />
          <Field label="Soyad" {...form.register("lastName")} required />
          <Field label="E-posta" type="email" {...form.register("email")} required />
          <Field label="Telefon" {...form.register("phone")} />
          <Field label="Uyruk" {...form.register("nationality")} required />
          <div>
            <Label>Doğum tarihi</Label>
            <Input type="date" {...form.register("dateOfBirth")} />
          </div>
          <Field label="Pasaport No" {...form.register("passportNumber")} />
          <Field label="BRP No" {...form.register("brpNumber")} />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vize tipi" {...form.register("visaType")} required />
          <Field label="CoS referans" {...form.register("cosReference")} required />
          <div>
            <Label>CoS atama tarihi</Label>
            <Input type="date" {...form.register("cosAssignDate")} required />
          </div>
          <div>
            <Label>CoS bitiş</Label>
            <Input type="date" {...form.register("cosExpiryDate")} required />
          </div>
          <div>
            <Label>Vize başlangıç</Label>
            <Input type="date" {...form.register("visaStartDate")} />
          </div>
          <div>
            <Label>Vize bitiş</Label>
            <Input type="date" {...form.register("visaExpiryDate")} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ünvan" {...form.register("jobTitle")} required />
          <Field label="SOC kodu" {...form.register("occupationCode")} required />
          <div className="sm:col-span-2">
            <Label>İş tanımı</Label>
            <Input {...form.register("jobDescription")} />
          </div>
          <Field
            label="Maaş (GBP/yıl)"
            type="number"
            {...form.register("salary", { valueAsNumber: true })}
            required
          />
          <Field label="Çalışma yeri" {...form.register("workLocation")} required />
          <div>
            <Label>Durum</Label>
            <Select
              value={form.watch("employmentStatus")}
              onValueChange={(v) =>
                form.setValue("employmentStatus", v as EmploymentStatus)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(EmploymentStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="offshore"
              checked={form.watch("isOffshoreWorker") ?? false}
              onChange={(e) =>
                form.setValue("isOffshoreWorker", e.target.checked)
              }
            />
            <Label htmlFor="offshore">Offshore çalışan</Label>
          </div>
          <Field label="Gemi adı" {...form.register("vesselName")} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            <strong>Ad:</strong> {form.watch("firstName")}{" "}
            {form.watch("lastName")}
          </p>
          <p>
            <strong>Vize:</strong> {form.watch("visaType")} · CoS{" "}
            {form.watch("cosReference")}
          </p>
          <p>
            <strong>İş:</strong> {form.watch("jobTitle")} · £
            {form.watch("salary")}
          </p>
        </div>
      ) : null}

      {submitError ? (
        <p className="text-sm text-red-600">{submitError}</p>
      ) : null}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Geri
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            İleri
          </Button>
        ) : (
          <Button type="submit">Kaydet</Button>
        )}
      </div>
    </form>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  { label: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Field({ label, ...rest }, ref) {
  return (
    <div>
      <Label>{label}</Label>
      <Input ref={ref} {...rest} />
    </div>
  );
});
Field.displayName = "Field";
