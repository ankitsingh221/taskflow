import { Search } from 'lucide-react';
import { STATUS_OPTIONS } from '../../constants';

const JobFilters = ({ search, onSearchChange, status, onStatusChange }) => (
  <div className="tf-card">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search jobs..."
          aria-label="Search jobs"
          className="tf-input pl-9"
        />
      </div>
      <div>
        <label htmlFor="job-status-filter" className="sr-only">
          Filter by status
        </label>
        <select
          id="job-status-filter"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="tf-select sm:w-48"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

export default JobFilters;
