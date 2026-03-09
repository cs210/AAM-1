"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function AcceptInvitationContent() {
  const t = useTranslations("acceptInvitation");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationId = searchParams.get("invitationId");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      return;
    }

    const id = invitationId;
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    async function accept() {
      setStatus("loading");
      const { error } = await authClient.organization.acceptInvitation({
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
        setMessage(error.message ?? t("couldNotAccept"));
        return;
      }

      setStatus("success");
      setMessage(t("joined"));
      redirectTimer = setTimeout(() => router.push("/dashboard"), 2000);
    }

    void accept();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [invitationId, router, t]);

  if (!invitationId) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t("invalidLink")}</CardTitle>
            <CardDescription>{t("invalidLinkDescription")}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" render={<Link href="/" />}>
              {tCommon("goHome")}
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
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {status === "loading" && t("accepting")}
            {status === "success" && message}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        {(status === "error" || status === "success") && (
          <CardFooter>
            <Button className="w-full" variant={status === "success" ? "default" : "outline"} render={<Link href="/dashboard" />}>
              {t("goToDashboard")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  const t = useTranslations("acceptInvitation");
  const tCommon = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{tCommon("loading")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
