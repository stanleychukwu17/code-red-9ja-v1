const getIsoDate = (isoString: string | number) => {
  const isoDate = new Date(isoString); // '2025-02-26T01:34:45.605Z' => Date object
  return isoDate;
};

type Time = "numeric" | "2-digit" | undefined;
type LocalTimeOptions =
  | { hour?: Time; minute?: Time; second?: Time; hour12?: boolean }
  | undefined;

/**
 * EXAMPLE USAGE\
 * - getLocalTime("2025-02-26T01:34:45.605Z")  // 02:54 PM
 * @param isoString
 * @param options
 * @returns
 */
export const getLocalTime = (
  isoString: string | number,
  options?: LocalTimeOptions,
) => {
  const isoDate = getIsoDate(isoString); // '2025-02-26T01:34:45.605Z'
  const localTime = isoDate.toLocaleTimeString("en-US", {
    hour: options?.hour ?? "2-digit",
    minute: options?.minute ?? "2-digit",
    second: options?.second,
    hour12: options?.hour12 ?? true,
  });
  return localTime; // 02:54 PM
};

type LocalDateOptions =
  | { month: "short"; day: "numeric"; year?: "numeric" | "2-digit" }
  | undefined;

/**
 * EXAMPLE USAGE\
 * - getLocalDate('2025-02-26T01:34:45.605Z') // 'Feb 26'
 * @param isoString
 * @param options
 * @returns
 */
export const getLocalDate = (
  isoString: string | number,
  options?: LocalDateOptions,
) => {
  const isoDate = getIsoDate(isoString); // '2025-02-26T01:34:45.605Z'
  const localDate = isoDate.toLocaleString("en-US", {
    month: options?.month ?? "short",
    day: options?.day ?? "numeric",
    year: options?.year,
  }); // 'Feb 26'
  return localDate;
};

export const isToday = (isoString: string | number) => {
  const date = getIsoDate(isoString);
  const today = new Date();

  const isSameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return isSameDay;
};

/**
 * Gets time(e.g. 02:54 PM) if it is today, else if it is in the past it returns the date instead (e.g. Feb 25);
 * @param isoString
 * @returns
 */
export const getNowDate = (isoString: string | number) => {
  if (isToday(isoString)) return getLocalTime(isoString); // 02:54 PM

  return getLocalDate(isoString); // Feb 25
};

export const getFullDate = (isoString: string | number) => {
  const date = getLocalDate(isoString);
  const time = getLocalTime(isoString);
  return;
};

/**
 * EXAMPLE USAGE:
 * @param isoDate
 * @returns
 */
export function formatISODate(
  isoDate: string | number,
  opt?: { year: "2-digit" | "numeric" },
): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    year: opt?.year ?? "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
}

/**
 * EXAMPLE USAGE:
 * @param startDate
 * @param endDate
 * @returns
 */
export function getDateDuration(
  startDate: string | number,
  endDate: string | number,
): string {
  const { years, months, days } = getDateDurationData(startDate, endDate);

  // Format output
  if (years > 0) {
    return `${years}yr ${months}mo`;
  }
  return `${months}mo ${days}d`;
}

/**
 * EXAMPLE USAGE:
 * @param startDate
 * @param endDate
 * @returns
 */
export function getDateDurationData(
  startDate: string | number,
  endDate: string | number,
): { years: number; months: number; days: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  // Adjust if days are negative (borrow from previous month)
  if (days < 0) {
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonth;
    months -= 1;
  }

  // Adjust if months are negative (borrow from previous year)
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

/**
 * EXAMPLE USAGE:
 * @param startTime
 * @param endTime
 * @returns
 */
export const formatStartAndEndTime = (
  startTime: string | number,
  endTime: string | number,
  options?: { noPrefix?: boolean },
) => {
  // const startTimeF = getLocalTime(startTime).split(" ")[0]; // 10:00 AM -> 10:00
  // const endTimeF = getLocalTime(endTime).split(" ")[0]; // 12:00 AM -> 12:00
  const startTimeF = getLocalTime(startTime);
  const endTimeF = getLocalTime(endTime);

  if (options && options.noPrefix)
    return `${startTimeF.slice(0, startTimeF.length - 2)} - ${endTimeF.slice(0, endTimeF.length - 2)}`;

  return `${startTimeF} - ${endTimeF}`;
};

/**
 * EXAMPLE USAGE:
 * @param isoDate
 * @returns
 */
export function timeAgo(isoDate: string | number): string {
  const now = new Date();
  const past = new Date(isoDate);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 0) return `0s`;
  if (diffInSeconds < 60) return `${diffInSeconds}s`; // Seconds
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`; // Minutes
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`; // Hours
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`; // Days
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 52) return `${diffInWeeks}w`; // Weeks
  const diffInYears = Math.floor(diffInWeeks / 52);
  return `${diffInYears}y`; // Years
}

/**
 * EXAMPLE USAGE:
 * @param isoDate
 * @returns "future" | "today" | "past"
 */
export function getDateStatus(isoDateStr: string | number) {
  const inputDate = new Date(isoDateStr);
  const today = new Date();

  // Normalize both dates to midnight for accurate comparison (ignores time)
  const inputMidnight = new Date(
    inputDate.getFullYear(),
    inputDate.getMonth(),
    inputDate.getDate(),
  );
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (inputMidnight.getTime() < todayMidnight.getTime()) {
    return "past";
  } else if (inputMidnight.getTime() > todayMidnight.getTime()) {
    return "future";
  } else {
    return "today";
  }
}

export function getInputTimeFormat(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a Date object to "MM/DD/YYYY" format for display
 * EXAMPLE USAGE:
 * formatDateToMMDDYYYY(new Date("2025-11-18")) // "11/18/2025"
 * @param date
 * @returns
 */
export function formatDateToMMDDYYYY(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Formats a Date object to "YYYY-MM-DD" format for backend storage
 * EXAMPLE USAGE:
 * formatDateToYYYYMMDD(new Date("2025-11-18")) // "2025-11-18"
 * @param date
 * @returns
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string in "MM/DD/YYYY" or "YYYY-MM-DD" format to a Date object
 * EXAMPLE USAGE:
 * parseDateString("11/18/2025") // Date object
 * parseDateString("2025-11-18") // Date object
 * @param dateString
 * @returns
 */
export function parseDateString(dateString: string): Date | undefined {
  if (!dateString) return undefined;

  // Check if it's MM/DD/YYYY format
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length !== 3) return undefined;

    const month = parseInt(parts[0]!, 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[1]!, 10);
    const year = parseInt(parts[2]!, 10);

    return new Date(year, month, day);
  }

  // Check if it's YYYY-MM-DD format
  if (dateString.includes("-")) {
    const parts = dateString.split("-");
    if (parts.length !== 3) return undefined;

    const year = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2]!, 10);

    return new Date(year, month, day);
  }

  return undefined;
}

/**
 * Parses a time string (HH:MM) to a timestamp
 * EXAMPLE USAGE:
 * parseTimeStringToTimestamp("14:30") // timestamp
 * @param timeString
 * @returns
 */
export function parseTimeStringToTimestamp(timeString: string): number {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date.getTime();
}

/**
 * Formats a timestamp to a time string (HH:MM)
 * EXAMPLE USAGE:
 * formatTimestampToTimeString(1699876800000) // "14:30"
 * @param timestamp
 * @returns
 */
export function formatTimestampToTimeString(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
