"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

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

    const response = await fetch("http://localhost:8000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.detail || "Unable to register. Try a different username.");
      return;
    }

    login(username.trim(), password);
    router.push("/#demo");
  };

  return (
    <main className="min-h-screen bg-[#0c0915] text-white flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Create Account</h1>
        <p className="mb-5 text-sm text-zinc-300">
          Register to unlock unlimited demo uses and target download button access.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-zinc-300">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </label>

          {message && <div className="rounded-lg bg-red-800/40 p-2 text-sm text-red-200">{message}</div>}

          <button
            type="submit"
            className="w-full rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
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
