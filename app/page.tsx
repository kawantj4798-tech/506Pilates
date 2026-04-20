import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AuthDialogSection } from "@/components/auth-dialog-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <Card className="w-full max-w-lg border-0 bg-transparent p-0 shadow-none ring-0">
        <CardHeader className="px-0 text-center">
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            506 Pilates Lab
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground sm:text-lg">
            Strength, balance, and breath — right here in the Heights.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          <AuthDialogSection />
        </CardContent>
      </Card>
    </main>
  );
}
