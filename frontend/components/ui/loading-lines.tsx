"use client";

export default function LoadingLines() {
  const letters = "Loading".split("");

  return (
    <div className="relative m-8 flex h-[120px] w-auto select-none items-center justify-center font-sans text-[1.6em] font-semibold text-white scale-[1.75] sm:scale-[2]">
      {letters.map((letter, idx) => (
        <span
          key={idx}
          className="relative z-[2] inline-block opacity-0 text-white animate-[letterAnim_4s_linear_infinite]"
          style={{ animationDelay: `${0.1 + idx * 0.105}s` }}
        >
          {letter}
        </span>
      ))}

      <div className="absolute left-0 top-0 z-[1] h-full w-full bg-transparent [mask:repeating-linear-gradient(90deg,transparent_0,transparent_6px,black_7px,black_8px)]">
        <div
          className="absolute left-0 top-0 h-full w-full animate-[transformAnim_2s_infinite_alternate_cubic-bezier(0.6,0.8,0.5,1),opacityAnim_4s_infinite] [background-image:radial-gradient(circle_at_50%_50%,rgba(216,180,254,0.95)_0%,transparent_48%),radial-gradient(circle_at_45%_45%,rgba(168,85,247,0.82)_0%,transparent_43%),radial-gradient(circle_at_55%_55%,rgba(192,132,252,0.76)_0%,transparent_43%),radial-gradient(circle_at_45%_55%,rgba(91,33,182,0.7)_0%,transparent_40%),radial-gradient(circle_at_55%_45%,rgba(244,114,182,0.5)_0%,transparent_38%)] [mask:radial-gradient(circle_at_50%_50%,transparent_0%,transparent_10%,black_25%)]"
        />
      </div>

      <style jsx>{`
        @keyframes transformAnim {
          0% {
            transform: translate(-55%);
          }
          100% {
            transform: translate(55%);
          }
        }

        @keyframes opacityAnim {
          0%,
          100% {
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          65% {
            opacity: 0;
          }
        }

        @keyframes letterAnim {
          0% {
            opacity: 0;
          }
          5% {
            opacity: 1;
            text-shadow:
              0 0 4px rgba(255, 255, 255, 0.95),
              0 0 14px rgba(168, 85, 247, 0.4);
            transform: scale(1.08) translateY(-2px);
          }
          20% {
            opacity: 0.22;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
