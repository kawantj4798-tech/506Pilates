import type { Metadata } from "next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <Card className="w-full max-w-lg border-0 bg-transparent p-0 shadow-none ring-0">
        <CardHeader className="items-center gap-2 text-center sm:px-0">
          <CardTitle className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Dashboard
          </CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Your Pilates hub — content coming soon.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
