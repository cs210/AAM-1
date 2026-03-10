"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function SignInContent() {
  const t = useTranslations("auth.signIn");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
      callbackURL,
    });
    setIsLoading(false);
    if (err) {
      setError(err.message ?? t("signInFailed"));
      return;
    }
    if (data) router.push(callbackURL);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4 pb-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="sign-in-email">{t("email")}</FieldLabel>
                <Input
                  id="sign-in-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sign-in-password">{t("password")}</FieldLabel>
                <Input
                  id="sign-in-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("signingIn") : t("submit")}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {t("noAccount")}{" "}
              <Link
                href="/sign-up"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {tCommon("signUp")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  const t = useTranslations("auth.signIn");
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
      <SignInContent />
    </Suspense>
  );
}
