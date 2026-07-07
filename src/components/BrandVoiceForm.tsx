"use client";

import { useEffect, useState } from "react";
import {
  loadBrandVoice,
  saveBrandVoice,
  clearBrandVoice,
} from "@/lib/brandVoice";

const PERSONALITY = [
  "Confident",
  "Warm",
  "Witty",
  "Bold",
  "Playful",
  "Authoritative",
  "Friendly",
  "Inspirational",
  "Minimalist",
  "Empathetic",
  "Data-driven",
  "Irreverent",
];
const FORMALITY = [
  "Casual",
  "Conversational",
  "Balanced",
  "Professional",
  "Formal",
];
const INDUSTRY = [
  "SaaS / Tech",
  "E-commerce",
  "Finance",
  "Healthcare",
  "Education",
  "Marketing / Agency",
  "Real estate",
  "Hospitality",
  "Nonprofit",
  "Other",
];

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

export default function BrandVoiceForm() {
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState<string[]>([]);
  const [formality, setFormality] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [avoid, setAvoid] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const v = loadBrandVoice();
    if (v) {
      setName(v.name ?? "");
      setPersonality(v.personality ?? []);
      setFormality(v.formality ?? "");
      setIndustry(v.industry ?? "");
      setDescription(v.description ?? "");
      setKeywords((v.keywords ?? []).join(", "));
      setAvoid((v.avoid ?? []).join(", "));
      setHasSaved(true);
    }
  }, []);

  function toggleTrait(t: string) {
    setPersonality((cur) =>
      cur.includes(t)
        ? cur.filter((x) => x !== t)
        : cur.length < 6
          ? [...cur, t]
          : cur,
    );
  }

  function save() {
    if (!name.trim()) {
      setSavedMsg("Give your brand voice a name first.");
      return;
    }
    saveBrandVoice({
      name: name.trim().slice(0, 60),
      personality: personality.length ? personality : undefined,
      formality: formality || undefined,
      industry: industry || undefined,
      description: description.trim().slice(0, 500) || undefined,
      keywords: toList(keywords),
      avoid: toList(avoid),
    });
    setHasSaved(true);
    setSavedMsg("Brand voice saved — enable it on the Generate page.");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  function reset() {
    clearBrandVoice();
    setName("");
    setPersonality([]);
    setFormality("");
    setIndustry("");
    setDescription("");
    setKeywords("");
    setAvoid("");
    setHasSaved(false);
    setSavedMsg("Brand voice cleared.");
    setTimeout(() => setSavedMsg(null), 2000);
  }

  const inputCls =
    "w-full rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2.5 text-sm text-[#141a16] outline-none transition-colors placeholder:text-[#5f6960] focus:border-[#0e7a63] focus:ring-2 focus:ring-[#0e7a63]/15";
  const labelCls =
    "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#5c665e]";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="animate-fade-up flex flex-col gap-6 rounded-xl border border-[#d9dfd8] bg-white p-6 shadow-sm">
        <div>
          <label className={labelCls} htmlFor="bv-name">
            Brand name
          </label>
          <input
            id="bv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Northwind"
            className={inputCls}
          />
        </div>

        {/* personality chips (choose up to 6) */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={labelCls + " mb-0"}>Personality</span>
            <span className="font-mono text-[0.68rem] text-[#5f6960]">
              {personality.length}/6 · tap to choose
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY.map((t) => {
              const active = personality.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrait(t)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 ${
                    active
                      ? "border-[#0e7a63] bg-[#0e7a63] text-white shadow-sm"
                      : "border-[#d9dfd8] bg-white text-[#3c4a54] hover:border-[#0e7a63]"
                  }`}
                >
                  {active ? "✓ " : ""}
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* dropdowns row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="bv-formality">
              Formality
            </label>
            <select
              id="bv-formality"
              value={formality}
              onChange={(e) => setFormality(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose…</option>
              {FORMALITY.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="bv-industry">
              Industry
            </label>
            <select
              id="bv-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={inputCls}
            >
              <option value="">Choose…</option>
              {INDUSTRY.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="bv-desc">
            Voice &amp; style notes{" "}
            <span className="normal-case text-[#5f6960]">(optional)</span>
          </label>
          <textarea
            id="bv-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Short sentences, plain language, a little dry humor. Speak to outcomes, never features."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="bv-keywords">
              Emphasize <span className="normal-case text-[#5f6960]">(comma-sep)</span>
            </label>
            <input
              id="bv-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="reliability, speed, craft"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="bv-avoid">
              Avoid <span className="normal-case text-[#5f6960]">(comma-sep)</span>
            </label>
            <input
              id="bv-avoid"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="synergy, revolutionary"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#eef1ed] pt-5">
          <button
            onClick={save}
            className="rounded-lg bg-[#0e7a63] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346] active:translate-y-0"
          >
            Save brand voice
          </button>
          {hasSaved && (
            <button
              onClick={reset}
              className="rounded-lg border border-[#d9dfd8] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#a62a2a] hover:text-[#a62a2a]"
            >
              Clear
            </button>
          )}
          {savedMsg && (
            <span className="animate-fade-in text-sm font-medium text-[#0a5346]">
              {savedMsg}
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-[#5c665e]">
        Saved locally to this browser. On the{" "}
        <span className="font-medium text-[#0a5346]">Generate</span> page, toggle{" "}
        <span className="font-medium">Use brand voice</span> to weave it into every
        prompt.
      </p>
    </div>
  );
}
