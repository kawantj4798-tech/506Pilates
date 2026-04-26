"use client";

import * as React from "react";
import { SignIn } from "@clerk/nextjs";

import { createBooking } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BookSlotButtonProps = {
  classId: number;
  startsAtIso: string;
  isSignedIn: boolean;
  slotLabel: string;
};

export function BookSlotButton({
  classId,
  startsAtIso,
  isSignedIn,
  slotLabel,
}: BookSlotButtonProps) {
  return isSignedIn ? (
    <SignedInBook
      classId={classId}
      startsAtIso={startsAtIso}
      slotLabel={slotLabel}
    />
  ) : (
    <SignedOutBook />
  );
}

function SignedInBook({
  classId,
  startsAtIso,
  slotLabel,
}: {
  classId: number;
  startsAtIso: string;
  slotLabel: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = React.useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createBooking({ classId, startsAtIso });
        setConfirmedAt(slotLabel);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not book that slot."
        );
      }
    });
  };

  if (confirmedAt) {
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        Booked for {confirmedAt}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Booking…" : "Book"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function SignedOutBook() {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Sign in to book
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign in to book</DialogTitle>
            <DialogDescription className="sr-only">
              Sign in to your account to reserve this slot.
            </DialogDescription>
          </DialogHeader>
          <div ref={containerRef} className="min-h-[min(70vh,420px)]">
            <SignIn
              routing="hash"
              getContainer={() => containerRef.current}
              withSignUp
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
