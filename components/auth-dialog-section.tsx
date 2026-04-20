"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AuthDialogSectionProps = {
  className?: string;
  buttonSize?: React.ComponentProps<typeof Button>["size"];
};

export function AuthDialogSection({
  className,
  buttonSize = "sm",
}: AuthDialogSectionProps) {
  const [signInOpen, setSignInOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const signInContainerRef = useRef<HTMLDivElement>(null);
  const signUpContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          className,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size={buttonSize}
          onClick={() => {
            setSignUpOpen(false);
            setSignInOpen(true);
          }}
        >
          Sign in
        </Button>
        <Button
          type="button"
          size={buttonSize}
          onClick={() => {
            setSignInOpen(false);
            setSignUpOpen(true);
          }}
        >
          Sign up
        </Button>
      </div>

      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign in</DialogTitle>
          </DialogHeader>
          <div ref={signInContainerRef} className="min-h-[min(70vh,420px)]">
            <SignIn
              routing="hash"
              getContainer={() => signInContainerRef.current}
              forceRedirectUrl="/dashboard"
              withSignUp
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={signUpOpen} onOpenChange={setSignUpOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="sr-only">Sign up</DialogTitle>
          </DialogHeader>
          <div ref={signUpContainerRef} className="min-h-[min(70vh,420px)]">
            <SignUp
              routing="hash"
              getContainer={() => signUpContainerRef.current}
              forceRedirectUrl="/dashboard"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
