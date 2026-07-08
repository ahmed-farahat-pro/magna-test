import BrandVoiceForm from "@/components/BrandVoiceForm";

export default function SettingsPage() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-2xl px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#141a16] sm:text-3xl">
          Brand voices
        </h1>
        <p className="mt-2 text-[#3c4a54]">
          Define how each of your brands sounds. Save as many as you need, then
          pick which one to apply when you generate.
        </p>
      </div>
      <BrandVoiceForm />
    </div>
  );
}
