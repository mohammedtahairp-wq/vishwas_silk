import type { City } from "../api/types";

export function CitySelect({
  cities,
  value,
  onChange,
  className = "",
  required = false,
}: {
  cities: City[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  required?: boolean;
}) {
  const names = cities.map((c) => c.name);
  // Preserve a previously-saved city that isn't in the managed list yet.
  const legacy = value && !names.includes(value) ? value : null;
  return (
    <select
      className={`border border-gray-300 rounded px-2 py-1.5 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">— Select city —</option>
      {legacy && <option value={legacy}>{legacy} (unlisted)</option>}
      {cities.map((c) => (
        <option key={c.id} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
