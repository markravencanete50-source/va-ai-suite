import SuggestionEngine from "@/components/SuggestionEngine";

export default function SuggestionsPage() {
  return (
    <div>
      <p className="label-mono">module 01</p>
      <h1 className="font-display text-2xl font-bold mt-1 mb-6">Suggestion engine</h1>
      <SuggestionEngine />
    </div>
  );
}
