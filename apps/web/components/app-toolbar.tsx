"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserIcon } from "lucide-react";
import { YamiLogo } from "@/components/yami-logo";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

const themeOptions = [
    { value: "light", icon: SunIcon, label: "Light" },
    { value: "dark", icon: MoonIcon, label: "Dark" },
    { value: "system", icon: MonitorIcon, label: "System" },
] as const;

function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button variant="ghost" size="icon-sm" aria-label="Toggle theme">
                        <SunIcon className="size-4 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
                        <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
                    </Button>
                }
            />
            <DropdownMenuPortal>
                <DropdownMenuContent align="end" className="min-w-fit">
                    <div className="px-1.5 py-1.5 text-sm pa">
                        <div className="flex items-center gap-0.5 rounded-sm bg-muted px-0.5 py-0.5 w-fit">
                            {themeOptions.map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setTheme(value)}
                                    className={`flex cursor-default items-center justify-center rounded-[5px] p-1.5 transition-colors ${theme === value
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    aria-label={label}
                                >
                                    <Icon className="size-3.5" />
                                </button>
                            ))}
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

export function AppToolbar() {
    const user = useQuery(api.auth.getCurrentUser);
    const router = useRouter();

    return (
        <header className="fixed left-1/2 top-4 z-50 w-full max-w-5xl -translate-x-1/2 px-4">
            <nav className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/80 px-4 py-2 shadow-lg shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/80 dark:shadow-black/20">
                <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
                    <YamiLogo />
                </Link>
                <div className="flex items-center gap-1">

                    {user === undefined ? (
                        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
                    ) : user === null ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
                                Sign in
                            </Button>
                            <Button size="sm" render={<Link href="/sign-up" />}>
                                Sign up
                            </Button>
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button variant="ghost" size="lg" className="gap-2 font-medium">
                                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 ">
                                            <UserIcon className="size-3.5" />
                                        </span>
                                        {user.name ?? user.email ?? "Account"}
                                    </Button>
                                }
                            />
                            <DropdownMenuPortal>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={async () => {
                                            await authClient.signOut({
                                                fetchOptions: {
                                                    onSuccess: () => {
                                                        router.push("/");
                                                    },
                                                },
                                            });
                                        }}
                                    >
                                        <LogOutIcon />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenuPortal>
                        </DropdownMenu>
                    )}
                    <ThemeToggle />
                </div>
            </nav>
        </header>
    );
}
