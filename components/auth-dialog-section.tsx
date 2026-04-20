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

export function AuthDialogSection() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const signInContainerRef = useRef<HTMLDivElement>(null);
  const signUpContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setSignUpOpen(false);
            setSignInOpen(true);
          }}
        >
          Sign in
        </Button>
        <Button
          type="button"
          size="lg"
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
              getContainer={() => signInContainerRef.current}
              fallbackRedirectUrl="/dashboard"
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
              getContainer={() => signUpContainerRef.current}
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
