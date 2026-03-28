import Link from "next/link";

export default function DownloadPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(120,74,255,0.16)_0%,_rgba(120,74,255,0.08)_16%,_rgba(18,18,24,0.92)_42%,_#0b0b0f_72%),linear-gradient(180deg,_#13131a_0%,_#0f1015_28%,_#0c0c11_55%,_#09090c_100%)] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-2xl border border-violet-900/30 bg-zinc-950/72 p-8 shadow-xl shadow-violet-950/30 backdrop-blur-md">
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
            className="block rounded-lg border border-violet-500/40 bg-violet-600 px-4 py-3 text-center font-medium text-white hover:bg-violet-500"
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
          <Link href="/" className="text-violet-300 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
