"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { CalendarIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type SchedulerDatePickerProps = {
  studioTimeZone: string;
  selectedDateYmd: string;
  availableDatesYmd: string[];
};

export function SchedulerDatePicker({
  studioTimeZone,
  selectedDateYmd,
  availableDatesYmd,
}: SchedulerDatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const available = React.useMemo(
    () => new Set(availableDatesYmd),
    [availableDatesYmd]
  );

  const selected = React.useMemo(
    () => toDate(`${selectedDateYmd}T12:00:00`, { timeZone: studioTimeZone }),
    [selectedDateYmd, studioTimeZone]
  );

  const label = formatInTimeZone(
    selected,
    studioTimeZone,
    "EEEE, MMM d, yyyy"
  );

  const [open, setOpen] = React.useState(false);

  const onSelect = (date: Date | undefined) => {
    if (!date) return;
    const ymd = formatInTimeZone(date, studioTimeZone, "yyyy-MM-dd");
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", ymd);
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  const todayYmd = formatInTimeZone(new Date(), studioTimeZone, "yyyy-MM-dd");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "default" }),
          "w-full justify-start text-left font-normal sm:w-[min(100%,280px)]"
        )}
      >
        <CalendarIcon className="mr-2 size-4 shrink-0" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          timeZone={studioTimeZone}
          selected={selected}
          onSelect={onSelect}
          defaultMonth={selected}
          disabled={(date) => {
            const ymd = formatInTimeZone(date, studioTimeZone, "yyyy-MM-dd");
            if (ymd === selectedDateYmd) return false;
            if (ymd < todayYmd) return true;
            return !available.has(ymd);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
