/**
 * @file Appointment Details and Tenure Form Section
 * @description Fields for appointment category (substantive, acting, caretaker, interim),
 * and tenure start & optional end dates.
 */

import * as React from "react";

export type AppointmentType = "substantive" | "acting" | "caretaker" | "interim";

interface AppointmentDetailsSectionProps {
  appointmentType: AppointmentType;
  onAppointmentTypeChange: (type: AppointmentType) => void;
  tenureStart: string;
  onTenureStartChange: (date: string) => void;
  tenureEnd: string;
  onTenureEndChange: (date: string) => void;
}

export function AppointmentDetailsSection({
  appointmentType,
  onAppointmentTypeChange,
  tenureStart,
  onTenureStartChange,
  tenureEnd,
  onTenureEndChange,
}: AppointmentDetailsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-[13px] font-semibold text-c-70 mb-1">
          Appointment Type
        </label>
        <select
          value={appointmentType}
          onChange={(e) => onAppointmentTypeChange(e.target.value as AppointmentType)}
          className="w-full h-10 px-3 text-[13px] rounded-xl border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange"
        >
          <option value="substantive">Substantive (Permanent)</option>
          <option value="acting">Acting</option>
          <option value="caretaker">Caretaker</option>
          <option value="interim">Interim</option>
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-c-70 mb-1">
          Tenure Start
        </label>
        <input
          type="date"
          value={tenureStart}
          onChange={(e) => onTenureStartChange(e.target.value)}
          className="w-full h-10 px-3 text-[13px] rounded-xl border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-c-70 mb-1">
          Tenure End <span className="text-c-40 font-normal">(Optional)</span>
        </label>
        <input
          type="date"
          value={tenureEnd}
          onChange={(e) => onTenureEndChange(e.target.value)}
          className="w-full h-10 px-3 text-[13px] rounded-xl border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange"
        />
      </div>
    </div>
  );
}
