"use client";

import { ComplaintForm } from "@/components/shared/complaint-form";

export default function LogisticsComplaintsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Report an Incident</h1>
        <p className="text-[#1c3a13]/50 mt-1">Submit a complaint or feedback about any issue on the platform.</p>
      </div>
      <ComplaintForm />
    </div>
  );
}
