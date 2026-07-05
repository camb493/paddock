type ProgressCardProps = {
  totalFound: number;
  totalCars: number;
  progress: number;
};

export function ProgressCard({
  totalFound,
  totalCars,
  progress,
}: ProgressCardProps) {
  return (
    <div className="mt-8 rounded-2xl bg-[#003d31] p-6 text-white">
      <p className="text-sm uppercase tracking-widest text-[#d8c38b]">
        Progress
      </p>

      <h2 className="mt-2 text-4xl font-bold">
        {totalFound} / {totalCars}
      </h2>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-[#d8c38b] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}