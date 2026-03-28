import Link from "next/link";

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#0c0915] text-white flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-4">Download Facticity Extension</h1>
        <p className="text-zinc-300 mb-6">
          Thanks for logging in. This is the extension download landing page.
          Add your install instructions and download links here when ready.
        </p>

        <div className="space-y-3">
          <a
            href="#"
            className="block rounded-lg border border-zinc-700 bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            Download for Chrome (placeholder)
          </a>
          <a
            href="#"
            className="block rounded-lg border border-zinc-700 bg-zinc-700 px-4 py-3 text-center font-medium text-white hover:bg-zinc-600"
          >
            Download for Firefox (placeholder)
          </a>
        </div>

        <p className="mt-6 text-sm text-zinc-400">
          <Link href="/" className="text-blue-400 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
