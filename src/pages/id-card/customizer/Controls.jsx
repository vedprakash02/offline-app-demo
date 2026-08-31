import "./Controls.css";

export const RangeControl = ({ label, value, min, max, step, suffix = "px", onChange }) => (
  <div>
    {label}:
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <span className="value-display">{value}{suffix}</span>
  </div>
);

export const ColorControl = ({ label, value, onChange }) => (
  <div className="color-picker-row">
    <label>{label}</label>
    <div className="color-picker-wrapper">
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="value-display">{value}</span>
    </div>
  </div>
);

export const PositionGroup = ({ title, children, className = "" }) => (
  <div className={`sliders-group-container ${className}`}>
    <label>{title}</label>
    {children}
  </div>
);
