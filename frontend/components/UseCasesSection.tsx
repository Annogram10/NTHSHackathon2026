"use client";

const useCases = [
  {
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    title: "News Articles",
    description:
      "Verify claims in breaking news before sharing. Understand the full context behind headlines.",
    color: "blue",
  },
  {
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
        />
      </svg>
    ),
    title: "Social Posts",
    description:
      "Fact-check viral posts, memes, and claims circulating on social platforms.",
    color: "purple",
  },
  {
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
        />
      </svg>
    ),
    title: "YouTube Transcripts",
    description:
      "Analyze what podcast hosts and YouTubers claim — get the sources they omitted.",
    color: "red",
  },
  {
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h.008M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75M9.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75"
        />
      </svg>
    ),
    title: "Podcasts & Interviews",
    description:
      "Verify guest claims and statistics in long-form audio content.",
    color: "emerald",
  },
];

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  blue: {
    bg: "hover:bg-blue-50 dark:hover:bg-blue-500/5",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-transparent hover:border-blue-200 dark:hover:border-blue-800",
    icon: "bg-blue-100 dark:bg-blue-500/10",
  },
  purple: {
    bg: "hover:bg-purple-50 dark:hover:bg-purple-500/5",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-transparent hover:border-purple-200 dark:hover:border-purple-800",
    icon: "bg-purple-100 dark:bg-purple-500/10",
  },
  red: {
    bg: "hover:bg-red-50 dark:hover:bg-red-500/5",
    text: "text-red-600 dark:text-red-400",
    border: "border-transparent hover:border-red-200 dark:hover:border-red-800",
    icon: "bg-red-100 dark:bg-red-500/10",
  },
  emerald: {
    bg: "hover:bg-emerald-50 dark:hover:bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-transparent hover:border-emerald-200 dark:hover:border-emerald-800",
    icon: "bg-emerald-100 dark:bg-emerald-500/10",
  },
};

export function UseCasesSection() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-zinc-900/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Use cases
          </h2>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Facticity works wherever you encounter claims that need verification
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((useCase) => {
            const colors = colorMap[useCase.color];
            return (
              <div
                key={useCase.title}
                className={`group p-5 rounded-2xl border ${colors.border} bg-zinc-50 dark:bg-zinc-900 ${colors.bg} transition-all duration-300 cursor-default`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.icon} ${colors.text} mb-4 transition-transform duration-300 group-hover:scale-110`}
                >
                  {useCase.icon}
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {useCase.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
