"use client";

import type { ChangeEvent } from "react";
import { CarCard } from "./CarCard";
import { manufacturers } from "../data/festival-of-speed";

type AiResult = {
  match: string | null;
  confidence: string;
  reason: string;
  error?: string;
  movedFrom?: string;
  movedTo?: string;
};

type SectionStats = {
  found: number;
  total: number;
  complete: boolean;
  percent: number;
};

export function ManufacturerSection({
  manufacturer,
  startIndex,
  stats,
  isOpen,
  searchText,
  checked,
  photos,
  identifying,
  aiResults,
  toggleSection,
  toggleCar,
  handlePhotoUpload,
  identifyCar,
}: {
  manufacturer: (typeof manufacturers)[number];
  startIndex: number;
  stats: SectionStats;
  isOpen: boolean;
  searchText: string;
  checked: boolean[];
  photos: Record<string, string>;
  identifying: Record<string, boolean>;
  aiResults: Record<string, AiResult>;
  toggleSection: (name: string) => void;
  toggleCar: (carIndex: number) => void;
  handlePhotoUpload: (
    carKey: string,
    carIndex: number,
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  identifyCar: (fullName: string) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        stats.complete
          ? "border-[#003d31] bg-[#e7f3ed]"
          : "border-[#e7dfd1] bg-[#fffaf0]"
      }`}
    >
      <button
        type="button"
        onClick={() => toggleSection(manufacturer.name)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="w-full pr-4">
          <h2 className="text-xl font-black">
            {stats.complete ? "✅ " : ""}
            {manufacturer.name}
          </h2>

          <p className="text-sm font-bold text-gray-500">
            {stats.found} / {stats.total} found
          </p>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[#003d31] transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>

        <span className="text-2xl font-black">{isOpen ? "⌄" : "›"}</span>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-[#e7dfd1] p-4">
          {manufacturer.cars.map((car, index) => {
            const currentIndex = startIndex + index;
            const fullName = `${manufacturer.name} ${car}`;
            const isVisible = fullName.toLowerCase().includes(searchText);

            if (!isVisible) return null;

            return (
              <CarCard
                key={fullName}
                car={car}
                fullName={fullName}
                carIndex={currentIndex}
                checked={checked[currentIndex] || false}
                photo={photos[fullName]}
                identifying={identifying[fullName] || false}
                aiResult={aiResults[fullName]}
                toggleCar={toggleCar}
                handlePhotoUpload={handlePhotoUpload}
                identifyCar={identifyCar}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
