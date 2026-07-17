"use client";

import type { ChangeEvent } from "react";
import { AiResultCard, type AiResult } from "./AiResultCard";

export function CarCard({
  car, fullName, carIndex, checked, photo, identifying, aiResult, toggleCar, handlePhotoUpload, identifyCar,
}: {
  car: string;
  fullName: string;
  carIndex: number;
  checked: boolean;
  photo?: string;
  identifying: boolean;
  aiResult?: AiResult;
  toggleCar: (carIndex: number) => void;
  handlePhotoUpload: (carKey: string, carIndex: number, event: ChangeEvent<HTMLInputElement>) => void;
  identifyCar: (fullName: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#e7dfd1] bg-white p-4">
      <label className="flex cursor-pointer items-center gap-3 text-lg font-bold">
        <input type="checkbox" checked={checked} onChange={() => toggleCar(carIndex)} className="h-6 w-6 accent-[#003d31]" />
        <span>{car}</span>
      </label>
      <label className="mt-3 inline-block cursor-pointer rounded-xl bg-[#003d31] px-4 py-2 text-sm font-bold text-white">
        {photo ? "📸 Retake / Change Photo" : "📸 Scan Car"}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handlePhotoUpload(fullName, carIndex, event)} />
      </label>
      {photo && (
        <div className="mt-4">
          <img src={photo} alt={fullName} className="h-40 w-full rounded-2xl object-cover" />
          <p className="mt-2 text-sm font-bold text-green-600">✓ Photo attached</p>
          {identifying && (
            <div className="mt-3 rounded-xl bg-[#b99a58] px-4 py-3 text-center text-sm font-bold text-white">🤖 Analysing photo...</div>
          )}
          {!identifying && !aiResult && (
            <button type="button" onClick={() => identifyCar(fullName)} className="mt-3 rounded-xl bg-[#b99a58] px-4 py-2 text-sm font-bold text-white">🤖 Analyse Again</button>
          )}
          {aiResult && <AiResultCard aiResult={aiResult} identifyAgain={() => identifyCar(fullName)} />}
        </div>
      )}
    </div>
  );
}
