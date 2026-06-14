import { useEffect, useState } from "react";
import {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
  parseDateString,
} from "../../lib/date";
import { BulletProps } from "../../lib/types";
import { Bullet } from "../button";
import { Calendar } from "../calendar";
import { SelectResponsiveWrapper } from "../selects/select-responsive-wrapper";
import CalendarIcon from "../../icons/navbar/calendar-icon";

export const DateBullet = ({
  initialData,
  buttonText,
  update,
  errorMsg,
}: BulletProps<string>) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialData ? parseDateString(initialData) : undefined,
  );

  const now = new Date();

  useEffect(() => {
    if (initialData) {
      setSelectedDate(parseDateString(initialData));
    }
  }, [initialData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);
    // Store in YYYY-MM-DD format for backend compatibility
    update(formatDateToYYYYMMDD(date));
    setOpen(false);
  };

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={buttonText ? `Select ${buttonText}` : "Select Date"}
      trigger={
        <Bullet showError={!!errorMsg}>
          <CalendarIcon />
          <p>
            {buttonText ? buttonText : "Date"}
            {selectedDate && ": " + formatDateToMMDDYYYY(selectedDate)}
          </p>
        </Bullet>
      }
    >
      <div className="flex justify-center p-3 bg-white">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          captionLayout="dropdown"
          className="p-0"
          defaultMonth={selectedDate || now}
          startMonth={new Date(now.getFullYear() - 1, 0)}
          endMonth={new Date(now.getFullYear() + 1, 11)}
        />
      </div>
    </SelectResponsiveWrapper>
  );
};
