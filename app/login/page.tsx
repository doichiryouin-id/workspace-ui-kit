import { Suspense } from "react";

import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">読み込み中…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
