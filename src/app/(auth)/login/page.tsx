"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Building2,
  Shield,
  UserCog,
  Briefcase,
  Users,
  Eye,
} from "lucide-react";

const demoAccounts = [
  {
    label: "Super Admin",
    email: "admin@pqt.com",
    password: "password123",
    icon: Shield,
    color: "bg-[#dc2626] hover:bg-[#b91c1c] text-white",
  },
  {
    label: "Admin",
    email: "sarah.dubai@pqt.com",
    password: "password123",
    icon: UserCog,
    color: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  {
    label: "Manager",
    email: "mehmet.istanbul@pqt.com",
    password: "password123",
    icon: Briefcase,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    label: "Agent",
    email: "james.london@pqt.com",
    password: "password123",
    icon: Users,
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    label: "Viewer",
    email: "viewer@pqt.com",
    password: "password123",
    icon: Eye,
    color: "bg-gray-500 hover:bg-gray-600 text-white",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    error === "CredentialsSignin"
      ? "Invalid email or password"
      : error
        ? "An error occurred during sign in"
        : null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const errorCode = (result as any).code as string | undefined;
        let errorMessage = "Invalid email or password";

        if (errorCode === "ACCOUNT_DEACTIVATED") {
          errorMessage =
            "Your account is not activated. Contact crm@propertyquestturkey.com to activate your account.";
        } else if (errorCode?.startsWith("ACCOUNT_LOCKED_")) {
          const minutes = errorCode.replace("ACCOUNT_LOCKED_", "");
          errorMessage = `Account locked. Try again in ${minutes} minute${minutes === "1" ? "" : "s"}.`;
        } else if (errorCode === "TOO_MANY_ATTEMPTS") {
          errorMessage =
            "Too many failed attempts. Account locked for 30 minutes.";
        }

        setLoginError(errorMessage);
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoginError(null);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 text-[#dc2626]">
            <Image
              src="./PQT_logo.svg"
              alt="PQT Logo"
              width={120}
              height={120}
            />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your PQT CRM account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#dc2626] hover:text-[#b91c1c] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">
                Quick access - Demo accounts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.slice(0, 3).map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => fillCredentials(account.email, account.password)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${account.color}`}
              >
                <account.icon className="h-3.5 w-3.5" />
                {account.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {demoAccounts.slice(3).map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => fillCredentials(account.email, account.password)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${account.color}`}
              >
                <account.icon className="h-3.5 w-3.5" />
                {account.label}
              </button>
            ))}
          </div>

          <p className="mt-3 text-center text-[10px] text-gray-400">
            All demo accounts use password: password123
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginFormFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 text-[#dc2626]">
            <Building2 className="h-10 w-10" />
            <span className="text-2xl font-bold">PropertyQuestTurkey</span>
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>Sign in to your PropertyQuestTurkey account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#dc2626]" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#dc2626] to-[#b91c1c] p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
