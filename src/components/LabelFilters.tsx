
'use client';

type Label = { _id: string; name: string; color: string };
type Props = {
  labels: Label[];
  selectedLabel: string | null;
  onSelectLabel: (id: string | null) => void;
};

export default function LabelFilters({ labels, selectedLabel, onSelectLabel }: Props) {
  return (
    <div className="px-4 pt-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectLabel(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${!selectedLabel ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}
        >
          All
        </button>
        {labels.map((label) => (
          <button
            key={label._id}
            onClick={() => onSelectLabel(label._id)}
            style={{ backgroundColor: selectedLabel === label._id ? label.color : '' }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${selectedLabel === label._id ? 'text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}
          >
            {label.name}
          </button>
        ))}
      </div>
    </div>
  );
}
