import Link from "next/link";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { Button } from "@/components/ui/button";

export default function NewWorkerPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Yeni çalışan</h1>
          <p className="text-slate-600">Çok adımlı form</p>
        </div>
        <Link href="/workers">
          <Button variant="outline" type="button">
            Listeye dön
          </Button>
        </Link>
      </div>
      <WorkerForm />
    </div>
  );
}
