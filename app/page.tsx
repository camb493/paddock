"use client";

import { useEffect, useState } from "react";
import { ProgressCard } from "../components/ProgressCard";
import { manufacturers } from "../data/festival-of-speed";

type AiResult = {
  match: string | null;
  confidence: string;
  reason: string;
  error?: string;
  movedFrom?: string;
  movedTo?: string;
};

type BackupData = {
  version: 1;
  exportedAt: string;
  checked: boolean[];
  photos: Record<string, string>;
  aiResults: Record<string, AiResult>;
};

const allCars = manufacturers.flatMap((manufacturer) =>
  manufacturer.cars.map((car) => `${manufacturer.name} ${car}`)
);

export default function Home() {
  const [checked, setChecked] = useState<boolean[]>(
    Array(allCars.length).fill(false)
  );
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [identifying, setIdentifying] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["Ferrari"]);

  useEffect(() => {
    const savedProgress = localStorage.getItem("paddock-progress");
    const savedPhotos = localStorage.getItem("paddock-photos");
    const savedAiResults = localStorage.getItem("paddock-ai-results");

    if (savedProgress) setChecked(JSON.parse(savedProgress));
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
    if (savedAiResults) setAiResults(JSON.parse(savedAiResults));
  }, []);

  useEffect(() => {
    localStorage.setItem("paddock-progress", JSON.stringify(checked));
  }, [checked]);

  useEffect(() => {
    localStorage.setItem("paddock-photos", JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem("paddock-ai-results", JSON.stringify(aiResults));
  }, [aiResults]);

  function sectionStats(name: string) {
    let index = 0;

    for (const manufacturer of manufacturers) {
      const startIndex = index;
      index += manufacturer.cars.length;

      if (manufacturer.name === name) {
        const found = manufacturer.cars.filter(
          (_, carIndex) => checked[startIndex + carIndex]
        ).length;

        return {
          found,
          total: manufacturer.cars.length,
          complete: found === manufacturer.cars.length,
          percent: Math.round((found / manufacturer.cars.length) * 100),
        };
      }
    }

    return { found: 0, total: 0, complete: false, percent: 0 };
  }

  function sectionComplete(name: string) {
    return sectionStats(name).complete;
  }

  function toggleSection(name: string) {
    setOpenSections((current) =>
      current.includes(name)
        ? current.filter((section) => section !== name)
        : [...current, name]
    );
  }

  function findCarIndex(fullName: string) {
    return allCars.findIndex(
      (car) => car.toLowerCase() === fullName.toLowerCase()
    );
  }

  function findManufacturerName(fullName: string) {
    return manufacturers.find((manufacturer) =>
      fullName.startsWith(`${manufacturer.name} `)
    )?.name;
  }


  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read image"));
          return;
        }

        image.onload = () => {
          const maxWidth = 900;
          const scale = Math.min(1, maxWidth / image.width);
          const width = Math.round(image.width * scale);
          const height = Math.round(image.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Could not prepare image"));
            return;
          }

          context.drawImage(image, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };

        image.onerror = () => reject(new Error("Could not load image"));
        image.src = reader.result;
      };

      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
  }

  async function identifyImageForCar(fullName: string, image: string) {
    setIdentifying((current) => ({
      ...current,
      [fullName]: true,
    }));

    setAiResults((current) => {
      const updated = { ...current };
      delete updated[fullName];
      return updated;
    });

    try {
      const response = await fetch("/api/identify-car", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.error) {
        const message =
          result.error ||
          `The AI request failed with status ${response.status}.`;

        setAiResults((current) => ({
          ...current,
          [fullName]: {
            match: null,
            confidence: "error",
            reason:
              message +
              " If the terminal says insufficient_quota, check your OpenAI billing/usage.",
            error: message,
          },
        }));

        return;
      }

      const aiResult: AiResult = {
        match: result.match ?? null,
        confidence: result.confidence ?? "unknown",
        reason: result.reason ?? "No reason returned",
      };

      const isHighConfidence =
        aiResult.confidence.toLowerCase() === "high";

      if (aiResult.match && isHighConfidence) {
        const matchedIndex = findCarIndex(aiResult.match);

        if (matchedIndex !== -1) {
          const matchedFullName = allCars[matchedIndex];
          const originalIndex = findCarIndex(fullName);
          const wasMoved =
            matchedFullName.toLowerCase() !== fullName.toLowerCase();

          const savedResult: AiResult = {
            ...aiResult,
            movedFrom: wasMoved ? fullName : undefined,
            movedTo: wasMoved ? matchedFullName : undefined,
          };

          setPhotos((current) => {
            const updated = {
              ...current,
              [matchedFullName]: image,
            };

            if (wasMoved) {
              delete updated[fullName];
            }

            return updated;
          });

          setChecked((current) => {
            const updated = [...current];

            updated[matchedIndex] = true;

            if (wasMoved && originalIndex !== -1) {
              updated[originalIndex] = false;
            }

            return updated;
          });

          setAiResults((current) => {
            const updated = { ...current };

            delete updated[fullName];
            updated[matchedFullName] = savedResult;

            return updated;
          });

          const matchedManufacturer = findManufacturerName(matchedFullName);

          if (matchedManufacturer) {
            setOpenSections((current) =>
              current.includes(matchedManufacturer)
                ? current
                : [...current, matchedManufacturer]
            );
          }

          return;
        }

        setAiResults((current) => ({
          ...current,
          [fullName]: {
            ...aiResult,
            reason:
              aiResult.reason +
              " The AI result was not found in your current checklist.",
          },
        }));

        return;
      }

      setAiResults((current) => ({
        ...current,
        [fullName]: aiResult,
      }));
    } catch (error) {
      console.error(error);

      setAiResults((current) => ({
        ...current,
        [fullName]: {
          match: null,
          confidence: "error",
          reason: "Something went wrong while identifying the photo.",
          error: "Request failed",
        },
      }));
    } finally {
      setIdentifying((current) => ({
        ...current,
        [fullName]: false,
      }));
    }
  }

  async function handlePhotoUpload(
    carKey: string,
    carIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIdentifying((current) => ({
        ...current,
        [carKey]: true,
      }));

      const imageData = await compressImage(file);

      setPhotos((current) => ({
        ...current,
        [carKey]: imageData,
      }));

      setAiResults((current) => {
        const updated = { ...current };
        delete updated[carKey];
        return updated;
      });

      setChecked((current) => {
        const updated = [...current];
        updated[carIndex] = true;
        return updated;
      });

      await identifyImageForCar(carKey, imageData);
    } catch (error) {
      console.error(error);

      setAiResults((current) => ({
        ...current,
        [carKey]: {
          match: null,
          confidence: "error",
          reason: "The photo could not be prepared. Try taking another photo.",
          error: "Image compression failed",
        },
      }));
    } finally {
      setIdentifying((current) => ({
        ...current,
        [carKey]: false,
      }));

      event.target.value = "";
    }
  }

  async function identifyCar(fullName: string) {
    const image = photos[fullName];

    if (!image) {
      setAiResults((current) => ({
        ...current,
        [fullName]: {
          match: null,
          confidence: "low",
          reason: "Add a photo first.",
          error: "No photo attached",
        },
      }));
      return;
    }

    await identifyImageForCar(fullName, image);
  }

  function exportBackup() {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      checked,
      photos,
      aiResults,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `paddock-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        if (typeof reader.result !== "string") {
          throw new Error("Could not read backup");
        }

        const backup = JSON.parse(reader.result) as Partial<BackupData>;

        if (
          !Array.isArray(backup.checked) ||
          typeof backup.photos !== "object" ||
          backup.photos === null ||
          typeof backup.aiResults !== "object" ||
          backup.aiResults === null
        ) {
          throw new Error("Invalid backup file");
        }

        setChecked(
          backup.checked.length === allCars.length
            ? backup.checked
            : Array(allCars.length)
                .fill(false)
                .map((_, index) => Boolean(backup.checked?.[index]))
        );

        setPhotos(backup.photos as Record<string, string>);
        setAiResults(backup.aiResults as Record<string, AiResult>);

        alert("Backup imported successfully.");
      } catch (error) {
        console.error(error);
        alert("That backup file could not be imported.");
      } finally {
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("That backup file could not be read.");
      event.target.value = "";
    };

    reader.readAsText(file);
  }

  const totalFound = checked.filter(Boolean).length;
  const progress = (totalFound / allCars.length) * 100;
  const searchText = search.toLowerCase();

  const completedManufacturers = manufacturers.filter((manufacturer) =>
    sectionComplete(manufacturer.name)
  ).length;

  const achievements = [
    {
      title: "First Spot",
      description: "Find your first car",
      unlocked: totalFound >= 1,
    },
    {
      title: "Getting Warmed Up",
      description: "Find 5 cars",
      unlocked: totalFound >= 5,
    },
    {
      title: "Halfway There",
      description: "Find half the list",
      unlocked: totalFound >= Math.ceil(allCars.length / 2),
    },
    {
      title: "Ferrari Fan",
      description: "Find every Ferrari",
      unlocked: sectionComplete("Ferrari"),
    },
    {
      title: "McLaren Hunter",
      description: "Find every McLaren",
      unlocked: sectionComplete("McLaren"),
    },
  ];

  let carIndex = 0;

  return (
    <main className="min-h-screen bg-[#f4efe5] p-6 text-[#003d31]">
      <section className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <p className="text-sm font-bold tracking-[0.4em] text-[#b99a58]">
          PADDOCK
        </p>

        <h1 className="mt-4 text-5xl font-black">Festival of Speed</h1>

        <p className="mt-3 text-gray-500">
          Your automotive event companion.
        </p>

        <ProgressCard
          totalFound={totalFound}
          totalCars={allCars.length}
          progress={progress}
        />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Ferrari, F40, Porsche..."
          className="mt-6 w-full rounded-2xl border border-[#e7dfd1] bg-[#fffaf0] px-4 py-4 text-lg font-bold outline-none placeholder:text-gray-400"
        />

        <section className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="rounded-2xl bg-[#003d31] px-4 py-3 text-sm font-black text-white"
          >
            ⬇ Export Backup
          </button>

          <label className="cursor-pointer rounded-2xl bg-[#b99a58] px-4 py-3 text-center text-sm font-black text-white">
            ⬆ Import Backup
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importBackup}
            />
          </label>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e7dfd1] bg-[#fffaf0] p-4">
          <h2 className="text-xl font-black">🏆 Achievements</h2>

          <div className="mt-3 space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.title}
                className={`rounded-2xl p-4 ${
                  achievement.unlocked
                    ? "bg-[#003d31] text-white"
                    : "bg-white text-gray-400"
                }`}
              >
                <p className="font-black">
                  {achievement.unlocked ? "🏆" : "🔒"} {achievement.title}
                </p>
                <p className="text-sm font-bold opacity-75">
                  {achievement.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e7dfd1] bg-[#fffaf0] p-4">
          <h2 className="text-xl font-black">📊 Statistics</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-gray-500">🏎 Cars</p>
              <p className="text-2xl font-black">
                {totalFound} / {allCars.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-gray-500">📷 Photos</p>
              <p className="text-2xl font-black">
                {Object.keys(photos).length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-gray-500">🏭 Makes</p>
              <p className="text-2xl font-black">
                {completedManufacturers} / {manufacturers.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-bold text-gray-500">⭐ Complete</p>
              <p className="text-2xl font-black">{Math.round(progress)}%</p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {manufacturers.map((manufacturer) => {
            const startIndex = carIndex;
            carIndex += manufacturer.cars.length;

            const visibleCars = manufacturer.cars.filter((car) =>
              `${manufacturer.name} ${car}`.toLowerCase().includes(searchText)
            );

            if (visibleCars.length === 0) return null;

            const stats = sectionStats(manufacturer.name);
            const isOpen =
              openSections.includes(manufacturer.name) || search.length > 0;

            return (
              <div
                key={manufacturer.name}
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

                  <span className="text-2xl font-black">
                    {isOpen ? "⌄" : "›"}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-[#e7dfd1] p-4">
                    {manufacturer.cars.map((car, index) => {
                      const currentIndex = startIndex + index;
                      const fullName = `${manufacturer.name} ${car}`;
                      const aiResult = aiResults[fullName];
                      const isVisible = fullName
                        .toLowerCase()
                        .includes(searchText);

                      if (!isVisible) return null;

                      return (
                        <div
                          key={fullName}
                          className="rounded-2xl border border-[#e7dfd1] bg-white p-4"
                        >
                          <label className="flex cursor-pointer items-center gap-3 text-lg font-bold">
                            <input
                              type="checkbox"
                              checked={checked[currentIndex] || false}
                              onChange={() => {
                                const updated = [...checked];
                                updated[currentIndex] =
                                  !updated[currentIndex];
                                setChecked(updated);
                              }}
                              className="h-6 w-6 accent-[#003d31]"
                            />

                            <span>{car}</span>
                          </label>

                          <label className="mt-3 inline-block cursor-pointer rounded-xl bg-[#003d31] px-4 py-2 text-sm font-bold text-white">
                            {photos[fullName]
                              ? "📸 Retake / Change Photo"
                              : "📸 Scan Car"}

                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(event) =>
                                handlePhotoUpload(
                                  fullName,
                                  currentIndex,
                                  event
                                )
                              }
                            />
                          </label>

                          {photos[fullName] && (
                            <div className="mt-4">
                              <img
                                src={photos[fullName]}
                                alt={fullName}
                                className="h-40 w-full rounded-2xl object-cover"
                              />

                              <p className="mt-2 text-sm font-bold text-green-600">
                                ✓ Photo attached
                              </p>

                              {identifying[fullName] && (
                                <div className="mt-3 rounded-xl bg-[#b99a58] px-4 py-3 text-center text-sm font-bold text-white">
                                  🤖 Analysing photo...
                                </div>
                              )}

                              {!identifying[fullName] &&
                                photos[fullName] &&
                                !aiResult && (
                                  <button
                                    type="button"
                                    onClick={() => identifyCar(fullName)}
                                    className="mt-3 rounded-xl bg-[#b99a58] px-4 py-2 text-sm font-bold text-white"
                                  >
                                    🤖 Analyse Again
                                  </button>
                                )}

                              {aiResult && (
                                <div
                                  className={`mt-4 rounded-2xl border p-4 ${
                                    aiResult.error
                                      ? "border-red-200 bg-red-50 text-red-700"
                                      : aiResult.match
                                      ? "border-green-200 bg-green-50 text-green-800"
                                      : "border-yellow-200 bg-yellow-50 text-yellow-800"
                                  }`}
                                >
                                  <p className="text-sm font-black uppercase tracking-widest">
                                    🤖 AI Result
                                  </p>

                                  {aiResult.match ? (
                                    <>
                                      <p className="mt-2 text-xl font-black">
                                        {aiResult.match}
                                      </p>

                                      <p className="mt-1 text-sm font-bold">
                                        Confidence: {aiResult.confidence}
                                      </p>

                                      <p className="mt-2 text-sm font-bold opacity-80">
                                        {aiResult.reason}
                                      </p>

                                      {aiResult.movedFrom &&
                                        aiResult.movedTo && (
                                          <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">
                                            📷 Photo moved from{" "}
                                            {aiResult.movedFrom} to{" "}
                                            {aiResult.movedTo}
                                          </p>
                                        )}

                                      {aiResult.confidence.toLowerCase() ===
                                        "high" && (
                                        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black">
                                          ✓ High-confidence match saved
                                        </p>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => identifyCar(fullName)}
                                        className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black"
                                      >
                                        ↻ Analyse Again
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <p className="mt-2 text-lg font-black">
                                        No confident match
                                      </p>

                                      <p className="mt-2 text-sm font-bold opacity-80">
                                        {aiResult.reason}
                                      </p>

                                      <button
                                        type="button"
                                        onClick={() => identifyCar(fullName)}
                                        className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-black"
                                      >
                                        ↻ Try Again
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </section>
    </main>
  );
}
