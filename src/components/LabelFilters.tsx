
'use client';

type Label = { _id: string; name: string; color: string };
type Props = {
  labels: Label[];
  selectedLabel: string | null;
  onSelectLabel: (id: string | null) => void;
};

export default function LabelFilters({ labels, selectedLabel, onSelectLabel }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectLabel(null)}
          className={`shrink-0 rounded-full px-3 py-2 text-sm transition ${!selectedLabel ? 'bg-white text-slate-950 shadow-lg shadow-black/20' : 'border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}`}
        >
          All
        </button>
        {labels.map((label) => (
          <button
            key={label._id}
            onClick={() => onSelectLabel(label._id)}
            style={{ backgroundColor: selectedLabel === label._id ? label.color : '' }}
            className={`shrink-0 rounded-full px-3 py-2 text-sm transition ${selectedLabel === label._id ? 'text-slate-950 shadow-lg shadow-black/20' : 'border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}`}
          >
            {label.name}
          </button>
        ))}
      </div>
    </div>
  );
}
