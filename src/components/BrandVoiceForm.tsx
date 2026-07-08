"use client";

import { useEffect, useState } from "react";
import {
  listVoices,
  createVoice,
  updateVoice,
  deleteVoice,
  type BrandVoice,
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
const FORMALITY = ["Casual", "Conversational", "Balanced", "Professional", "Formal"];
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

const inputCls =
  "w-full rounded-lg border border-[#d9dfd8] bg-white px-3.5 py-2.5 text-sm text-[#141a16] outline-none transition-colors placeholder:text-[#5f6960] focus:border-[#0e7a63] focus:ring-2 focus:ring-[#0e7a63]/15";
const labelCls =
  "mb-1.5 block font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#5c665e]";

export default function BrandVoiceForm() {
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrandVoice | null>(null); // null = list view
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState<string[]>([]);
  const [formality, setFormality] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [avoid, setAvoid] = useState("");

  function refresh() {
    setLoading(true);
    listVoices().then((vs) => {
      setVoices(vs);
      setLoading(false);
    });
  }
  useEffect(() => {
    refresh();
  }, []);

  function loadInto(v: BrandVoice | null) {
    setName(v?.name ?? "");
    setPersonality(v?.personality ?? []);
    setFormality(v?.formality ?? "");
    setIndustry(v?.industry ?? "");
    setDescription(v?.description ?? "");
    setKeywords((v?.keywords ?? []).join(", "));
    setAvoid((v?.avoid ?? []).join(", "));
    setMsg(null);
  }
  function openNew() {
    loadInto(null);
    setEditing({ name: "" });
  }
  function openEdit(v: BrandVoice) {
    loadInto(v);
    setEditing(v);
  }

  function toggleTrait(t: string) {
    setPersonality((cur) =>
      cur.includes(t)
        ? cur.filter((x) => x !== t)
        : cur.length < 6
          ? [...cur, t]
          : cur,
    );
  }

  async function save() {
    if (!name.trim()) {
      setMsg("Give your brand voice a name first.");
      return;
    }
    const voice: BrandVoice = {
      name: name.trim().slice(0, 60),
      personality: personality.length ? personality : undefined,
      formality: formality || undefined,
      industry: industry || undefined,
      description: description.trim().slice(0, 500) || undefined,
      keywords: toList(keywords),
      avoid: toList(avoid),
    };
    setBusy(true);
    const saved = editing?.id
      ? await updateVoice(editing.id, voice)
      : await createVoice(voice);
    setBusy(false);
    if (saved) {
      setEditing(null);
      refresh();
    } else {
      setMsg("Could not save — please try again.");
    }
  }

  async function remove(v: BrandVoice) {
    if (!v.id) return;
    if (confirmId !== v.id) {
      setConfirmId(v.id);
      window.setTimeout(
        () => setConfirmId((c) => (c === v.id ? null : c)),
        3500,
      );
      return;
    }
    setConfirmId(null);
    setVoices((xs) => xs.filter((x) => x.id !== v.id));
    await deleteVoice(v.id);
  }

  // ── Form view ──
  if (editing) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="animate-fade-up flex flex-col gap-6 rounded-xl border border-[#d9dfd8] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#141a16]">
              {editing.id ? "Edit brand voice" : "New brand voice"}
            </h2>
            <button
              onClick={() => setEditing(null)}
              className="rounded-md px-2 py-1 text-sm text-[#5c665e] hover:bg-[#f4f7f3]"
            >
              ← Back
            </button>
          </div>

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
              placeholder="e.g. Short sentences, plain language, a little dry humor."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="bv-keywords">
                Emphasize{" "}
                <span className="normal-case text-[#5f6960]">(comma-sep)</span>
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
                Avoid{" "}
                <span className="normal-case text-[#5f6960]">(comma-sep)</span>
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
              disabled={busy}
              className="rounded-lg bg-[#0e7a63] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346] active:translate-y-0 disabled:opacity-50"
            >
              {busy ? "Saving…" : editing.id ? "Update voice" : "Save voice"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-[#d9dfd8] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63]"
            >
              Cancel
            </button>
            {msg && <span className="text-sm text-[#8a3315]">{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs text-[#5c665e]">
          {loading
            ? "loading…"
            : `${voices.length} brand voice${voices.length === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={openNew}
          className="rounded-lg bg-[#0e7a63] px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a5346]"
        >
          + Add brand voice
        </button>
      </div>

      {!loading && voices.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#d9dfd8] bg-white py-16 text-center">
          <p className="text-sm font-medium text-[#3c4a54]">No brand voices yet</p>
          <p className="max-w-xs text-xs text-[#5f6960]">
            Create one or more voices; pick which to apply when you generate.
          </p>
          <button
            onClick={openNew}
            className="mt-1 rounded-lg bg-[#0e7a63] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0a5346]"
          >
            Create your first voice →
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {voices.map((v) => (
          <div
            key={v.id}
            className="animate-fade-up flex flex-col gap-2 rounded-xl border border-[#d9dfd8] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#141a16]">{v.name}</span>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(v)} className={ghost}>
                  Edit
                </button>
                <button
                  onClick={() => remove(v)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    confirmId === v.id
                      ? "border-[#a62a2a] bg-[#a62a2a] text-white"
                      : "border-[#e7c9c0] bg-white text-[#a62a2a] hover:bg-[#f7e8e0]"
                  }`}
                >
                  {confirmId === v.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(v.personality ?? []).map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-[#bfe0d0] bg-[#e6f2ec] px-2 py-0.5 text-[0.66rem] font-medium text-[#0a5346]"
                >
                  {p}
                </span>
              ))}
              {v.formality && (
                <span className="rounded-full border border-[#d9dfd8] bg-white px-2 py-0.5 text-[0.66rem] text-[#3c4a54]">
                  {v.formality}
                </span>
              )}
              {v.industry && (
                <span className="rounded-full border border-[#d9dfd8] bg-white px-2 py-0.5 text-[0.66rem] text-[#3c4a54]">
                  {v.industry}
                </span>
              )}
            </div>
            {(v.keywords?.length || v.avoid?.length) && (
              <p className="font-mono text-[0.66rem] leading-relaxed text-[#5f6960]">
                {v.keywords?.length ? `emphasize: ${v.keywords.join(", ")}` : ""}
                {v.keywords?.length && v.avoid?.length ? " · " : ""}
                {v.avoid?.length ? `avoid: ${v.avoid.join(", ")}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ghost =
  "rounded-md border border-[#d9dfd8] bg-white px-2.5 py-1 text-xs font-medium text-[#3c4a54] transition-colors hover:border-[#0e7a63] hover:text-[#0a5346]";
