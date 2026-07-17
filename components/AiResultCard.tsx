"use client";

export type AiResult = {
  match: string | null;
  confidence: string;
  reason: string;
  error?: string;
  movedFrom?: string;
  movedTo?: string;
};

export function AiResultCard({ aiResult, identifyAgain }: { aiResult: AiResult; identifyAgain: () => void; }) {
  const cardColour = aiResult.error
    ? "border-red-200 bg-red-50 text-red-700"
    : aiResult.match
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-yellow-200 bg-yellow-50 text-yellow-800";

  return (
    <div className={`mt-4 rounded-2xl border p-4 ${cardColour}`}>
      <p className="text-sm font-black uppercase tracking-widest">🤖 AI Result</p>
      {aiResult.match ? (
        <>
          <p className="mt-2 text-xl font-black">{aiResult.match}</p>
          <p className="mt-1 text-sm font-bold">Confidence: {aiResult.confidence}</p>
          <p className="mt-2 text-sm font-bold opacity-80">{aiResult.reason}</p>
          {aiResult.movedFrom && aiResult.movedTo && (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">
              📷 Photo moved from {aiResult.movedFrom} to {aiResult.movedTo}
            </p>
          )}
          {aiResult.confidence.toLowerCase() === "high" && (
            <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">✓ High-confidence match saved</p>
          )}
          <button type="button" onClick={identifyAgain} className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">↻ Analyse Again</button>
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-black">No confident match</p>
          <p className="mt-2 text-sm font-bold opacity-80">{aiResult.reason}</p>
          <button type="button" onClick={identifyAgain} className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">↻ Try Again</button>
        </>
      )}
    </div>
  );
}
