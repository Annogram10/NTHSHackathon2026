"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setMessage("Please provide both username and password.");
      return;
    }

    const ok = login(username.trim(), password.trim());
    if (!ok) {
      setMessage("Could not log in. Please try again.");
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#0c0915] text-white flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Login / Register</h1>
        <p className="mb-5 text-sm text-zinc-300">
          Use the demo up to 3 times before login. After login, unlimited usage and download button are unlocked.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-zinc-300">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          {message && (
            <div className="rounded-lg bg-red-800/40 p-2 text-sm text-red-200">{message}</div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
          >
            Login / Register
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          Already have an account? Just log in. Otherwise the same form creates one.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/" className="text-blue-400 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
