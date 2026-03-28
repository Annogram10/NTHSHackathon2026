"use client";

const features = [
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
    title: "Multi-Source Verification",
    description:
      "Cross-references claims against research-style reference sources, including Wikipedia and Britannica, to identify agreement and contradictions.",
    color: "blue",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
        />
      </svg>
    ),
    title: "Bias Detection",
    description:
      "Highlights loaded framing and missing context so the verdict is not just a number.",
    color: "amber",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    title: "Trust Scoring",
    description:
      "A simple score and confidence readout help you judge how strongly the available sources support the claim.",
    color: "emerald",
  },
  {
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
    ),
    title: "Source Transparency",
    description:
      "Every analysis links back to the underlying references so you can inspect the evidence yourself.",
    color: "purple",
  },
];

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  blue: {
    bg: "bg-blue-500/8",
    text: "text-blue-300",
    border: "group-hover:border-blue-500/30",
    icon: "bg-blue-500/12",
  },
  amber: {
    bg: "bg-amber-500/8",
    text: "text-amber-300",
    border: "group-hover:border-amber-500/30",
    icon: "bg-amber-500/12",
  },
  emerald: {
    bg: "bg-emerald-500/8",
    text: "text-emerald-300",
    border: "group-hover:border-emerald-500/30",
    icon: "bg-emerald-500/12",
  },
  purple: {
    bg: "bg-purple-500/8",
    text: "text-purple-300",
    border: "group-hover:border-purple-500/30",
    icon: "bg-purple-500/12",
  },
};

export function FeatureSection() {
  return (
    <section className="bg-transparent py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            Built for source-based fact checking
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            The frontend is designed to keep the evidence visible, not hidden behind a black-box answer.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature) => {
            const colors = colorMap[feature.color];
            return (
              <div
                key={feature.title}
                className={`group relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${colors.border}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.icon} mb-4`}
                >
                  <span className={colors.text}>{feature.icon}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/90">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
