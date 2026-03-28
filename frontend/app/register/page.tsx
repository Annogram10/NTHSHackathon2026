"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (response.status === 404) {
          setMessage("Auth service was not found. Restart the backend and try again.");
          return;
        }

        setMessage(body?.detail || "Unable to register. Try a different username.");
        return;
      }

      login(username.trim(), password);
      router.push("/");
    } catch {
      setMessage("Could not reach the backend. Make sure the API server is running.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(120,74,255,0.16)_0%,_rgba(120,74,255,0.08)_16%,_rgba(18,18,24,0.92)_42%,_#0b0b0f_72%),linear-gradient(180deg,_#13131a_0%,_#0f1015_28%,_#0c0c11_55%,_#09090c_100%)] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-violet-900/30 bg-zinc-950/72 p-8 shadow-xl shadow-violet-950/30 backdrop-blur-md">
        <h1 className="text-2xl font-bold mb-4">Create Account</h1>
        <p className="mb-5 text-sm text-zinc-300">
          Create a backend account to unlock the checker and extension download access.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-zinc-300">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Choose a username"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-300">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </label>

          {message && <div className="rounded-lg bg-red-800/40 p-2 text-sm text-red-200">{message}</div>}

          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-2 font-medium text-white hover:bg-violet-500"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          Already have an account? <Link href="/login" className="text-violet-300 hover:underline">Login</Link>
        </p>
        <p className="mt-4 text-sm">
          <Link href="/" className="text-violet-300 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
