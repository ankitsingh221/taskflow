const VARIANTS = {
  primary: { icon: 'bg-indigo-500/15 text-indigo-400' },
  success: { icon: 'bg-emerald-500/15 text-emerald-400' },
  danger: { icon: 'bg-red-500/15 text-red-400' },
  neutral: { icon: 'bg-gray-500/15 text-gray-400' },
  default: { icon: 'bg-gray-500/15 text-gray-300' },
};

const StatCard = ({ title, value, icon: Icon, description, variant = 'default', loading = false }) => {
  if (loading) {
    return (
      <div className="tf-card">
        <div className="flex items-center justify-between">
          <div className="tf-skeleton h-4 w-24" />
          <div className="tf-skeleton h-9 w-9" />
        </div>
        <div className="tf-skeleton mt-4 h-7 w-16" />
        <div className="tf-skeleton mt-2 h-3 w-28" />
      </div>
    );
  }

  const style = VARIANTS[variant] ?? VARIANTS.default;

  return (
    <div className="tf-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${style.icon}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
};

export default StatCard;