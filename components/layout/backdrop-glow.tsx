export function BackdropGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div
        className="aurora-blob absolute -top-48 left-[8%] size-[42rem] rounded-full opacity-60 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, oklch(0.66 0.24 292 / 0.75), transparent 62%)",
          animation: "aurora-drift 20s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob absolute top-[12%] -right-52 size-[46rem] rounded-full opacity-55 blur-3xl dark:opacity-25"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, oklch(0.7 0.22 350 / 0.7), transparent 62%)",
          animation: "aurora-drift 26s ease-in-out infinite reverse",
        }}
      />
      <div
        className="aurora-blob absolute bottom-[-16rem] left-[18%] size-[40rem] rounded-full opacity-45 blur-3xl dark:opacity-20"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.84 0.15 70 / 0.6), transparent 62%)",
          animation: "aurora-drift 32s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob absolute top-[55%] left-[55%] size-[28rem] rounded-full opacity-30 blur-3xl dark:opacity-15"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.72 0.16 200 / 0.5), transparent 65%)",
          animation: "aurora-drift 24s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}
