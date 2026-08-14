import { Plus, Trash2 } from 'lucide-react';

const DependencyInput = ({ value, onChange }) => {
  const update = (index, nextValue) => {
    const next = [...value];
    next[index] = nextValue;
    onChange(next);
  };

  const add = () => onChange([...value, '']);

  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      <label className="tf-label">Dependencies</label>
      <p className="mb-2 text-xs text-gray-500">
        Logical job IDs this job depends on. Leave empty to start immediately.
      </p>
      <div className="space-y-2">
        {value.map((dependency, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="tf-input font-mono"
              value={dependency}
              onChange={(e) => update(index, e.target.value)}
              placeholder="job-id"
              aria-label={`Dependency ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="tf-button tf-button-secondary tf-button-sm shrink-0"
              aria-label={`Remove dependency ${index + 1}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="tf-button tf-button-secondary tf-button-sm mt-2">
        <Plus size={14} />
        Add dependency
      </button>
    </div>
  );
};

export default DependencyInput;
