import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <Card className="w-full max-w-5xl border-0 bg-transparent p-0 shadow-none ring-0">
        <CardHeader className="px-0 text-center">
          <h1 className="mb-4 w-full">
            <Link
              href="/"
              className="inline-flex w-full justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Image
                src="/banner.png"
                alt="506 Pilates Lab"
                width={1536}
                height={1024}
                className="h-auto w-full object-contain"
                priority
              />
            </Link>
          </h1>
          <CardDescription className="text-base text-muted-foreground sm:text-lg">
            Strength, balance, and breath — right here in the Heights.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
