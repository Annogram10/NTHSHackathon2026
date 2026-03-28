import Link from "next/link";

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#0c0915] text-white flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-xl">
        <h1 className="text-3xl font-bold mb-4">Install the Facticity Chrome Extension</h1>
        <p className="text-zinc-300 mb-6">
          Thanks for logging in. The extension now connects to the full
          Facticity source layer, including the live fact-check and news APIs
          used by the backend.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 text-xs text-purple-200">
          <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1">Google Fact Check</span>
          <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1">NewsAPI</span>
          <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1">GNews</span>
          <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1">Guardian</span>
          <span className="rounded-full border border-purple-800 bg-purple-950/40 px-3 py-1">MediaStack</span>
        </div>

        <div className="space-y-3">
          <a
            href="/facticity-chrome-extension.zip"
            download
            className="block rounded-lg border border-zinc-700 bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            Download Chrome Extension
          </a>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <h2 className="text-lg font-semibold text-white">Install in Chrome</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-300 list-decimal list-inside">
            <li>Click `Download Chrome Extension`.</li>
            <li>Unzip `facticity-chrome-extension.zip`.</li>
            <li>Open `chrome://extensions` in Chrome.</li>
            <li>Turn on `Developer mode` in the top-right corner.</li>
            <li>Click `Load unpacked`.</li>
            <li>Select the unzipped `chrome-extension-credcheck` folder.</li>
          </ol>
        </div>

        <div className="mt-4 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100">
          Chrome only allows true one-click extension installs through the Chrome Web Store.
          Until this is published there, the supported install path is `Download` + `Load unpacked`.
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
