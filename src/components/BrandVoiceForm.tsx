"use client";

import { useEffect, useState } from "react";
import {
  loadBrandVoice,
  saveBrandVoice,
  clearBrandVoice,
} from "@/lib/brandVoice";

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);

export default function BrandVoiceForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [avoid, setAvoid] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const v = loadBrandVoice();
    if (v) {
      setName(v.name ?? "");
      setDescription(v.description ?? "");
      setKeywords((v.keywords ?? []).join(", "));
      setAvoid((v.avoid ?? []).join(", "));
      setHasSaved(true);
    }
  }, []);

  function save() {
    if (!name.trim()) {
      setSavedMsg("Give your brand voice a name first.");
      return;
    }
    saveBrandVoice({
      name: name.trim().slice(0, 60),
      description: description.trim().slice(0, 500) || undefined,
      keywords: toList(keywords),
      avoid: toList(avoid),
    });
    setHasSaved(true);
    setSavedMsg("Brand voice saved. It'll be applied on the generator when enabled.");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  function reset() {
    clearBrandVoice();
    setName("");
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
      <div className="flex flex-col gap-5 rounded-xl border border-[#d9dfd8] bg-white p-6">
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
        <div>
          <label className={labelCls} htmlFor="bv-desc">
            Voice &amp; style
          </label>
          <textarea
            id="bv-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Confident and warm. Plain language, short sentences. A little dry humor, never corporate jargon."
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="bv-keywords">
            Emphasize (comma-separated)
          </label>
          <input
            id="bv-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="reliability, speed, craftsmanship"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="bv-avoid">
            Avoid (comma-separated)
          </label>
          <input
            id="bv-avoid"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="synergy, revolutionary, game-changer"
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-lg bg-[#0e7a63] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
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
            <span className="text-sm text-[#0a5346]">{savedMsg}</span>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-[#5c665e]">
        Saved locally to this browser session. On the{" "}
        <span className="font-medium text-[#0a5346]">Generate</span> page, toggle
        “Use brand voice” to weave it into every prompt.
      </p>
    </div>
  );
}
