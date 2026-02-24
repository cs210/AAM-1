"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationId = searchParams.get("invitationId");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setStatus("error");
      setMessage("Missing invitation link.");
      return;
    }

    const id = invitationId;
    let cancelled = false;

    async function accept() {
      setStatus("loading");
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId: id,
      });

      if (cancelled) return;

      if (error) {
        if (error.status === 401 || error.message?.toLowerCase().includes("sign in")) {
          const callbackUrl = `/accept-invitation?invitationId=${encodeURIComponent(id)}`;
          router.push(`/sign-in?callbackURL=${encodeURIComponent(callbackUrl)}`);
          return;
        }
        setStatus("error");
        setMessage(error.message ?? "Could not accept invitation.");
        return;
      }

      setStatus("success");
      setMessage("You have joined the organization.");
      setTimeout(() => router.push("/dashboard"), 2000);
    }

    accept();
    return () => {
      cancelled = true;
    };
  }, [invitationId, router]);

  if (!invitationId) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This invitation link is invalid or missing an ID.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" render={<Link href="/" />}>
              Go home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Organization invitation</CardTitle>
          <CardDescription>
            {status === "loading" && "Accepting invitation…"}
            {status === "success" && message}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        {(status === "error" || status === "success") && (
          <CardFooter>
            <Button className="w-full" variant={status === "success" ? "default" : "outline"} render={<Link href="/dashboard" />}>
              Go to dashboard
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Organization invitation</CardTitle>
              <CardDescription>Loading…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
