"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthLoginForm from "@/components/auth/AuthLoginForm";

function LoginFormWithParams() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  return <AuthLoginForm registered={!!registered} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFormWithParams />
    </Suspense>
  );
}
