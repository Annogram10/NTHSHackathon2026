"use client";

const steps = [
  {
    number: 1,
    title: "Submit Claim",
    description: "Paste any claim, headline, or statement you want to verify.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Search Sources",
    description:
      "We look for relevant material in sources like Wikipedia and Britannica, then compare the claim with the evidence.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-2.216.443a9.065 9.065 0 01-2.717 1.031l-2.216-.443c-1.717-.293-2.3-2.379-1.067-3.611L5 14.5"
        />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Get Verdict",
    description:
      "Receive a verdict, confidence score, explanation, and direct links to the source material used.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-transparent py-20 sm:py-28"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-white/90">
            Three steps from claim to evidence-backed verdict
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2rem)] top-10 hidden h-0.5 w-[calc(100%-4rem)] bg-gradient-to-r from-purple-900 to-purple-700 sm:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                {/* Step number circle */}
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-purple-900 bg-zinc-900 shadow-lg">
                  <div className="absolute inset-0 rounded-full bg-purple-500/10" />
                  <span className="z-10 text-purple-400">
                    {step.icon}
                  </span>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow-md">
                    {step.number}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-white/90">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
