"use client";

const LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Light",
  3: "Standard",
  4: "Strong",
  5: "Aggressive",
};

interface SynonymSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function SynonymSlider({ value, onChange }: SynonymSliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
        <span>Intensity</span>
        <span className="text-brand-600 dark:text-brand-400">
          {value} — {LABELS[value]}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
        aria-label="Paraphrase intensity"
      />
      <div className="flex justify-between text-xs text-gray-400">
        {Object.values(LABELS).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
