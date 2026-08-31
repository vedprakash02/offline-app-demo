import { PositionGroup, RangeControl } from "./Controls";
import "./SchoolTab.css";

const SchoolTab = ({ config, updateConfig }) => {
  const defaults = {
    schoolLogoSize: 52, schoolLogoLeft: 10, schoolLogoTop: 6, schoolNameWidth: 200,
    headerHeight: config.orientation === "landscape" ? 45 : 55, udiseColor: "#ffffff",
  };
  const value = (key) => config[key] ?? defaults[key];
  const range = (label, key, min, max) => <RangeControl label={label} min={min} max={max} value={value(key)} onChange={(nextValue) => updateConfig({ [key]: nextValue })} />;

  return <div className="tab-content-block school-tab">
    <div className="panel-title">School & Udise Spacing</div>
    <PositionGroup title="2. School Logo Position">
      {range("Size", "schoolLogoSize", 24, 120)}{range("Left", "schoolLogoLeft", -50, 300)}{range("Top", "schoolLogoTop", -20, 120)}
    </PositionGroup>
    <PositionGroup title="1. School Name Position">
      {range("Size", "schoolNameSize", 9, 24)}{range("Left", "schoolNameLeft", -50, 400)}{range("Top", "schoolNameTop", -20, 300)}{range("Width", "schoolNameWidth", 100, 500)}
    </PositionGroup>
    <PositionGroup title="3. UDISE Code Position">
      {range("Size", "schoolCodeSize", 5, 18)}{range("Left", "udiseLeft", -50, 400)}{range("Top", "udiseTop", -20, 300)}
      <button
        type="button"
        className={`udise-bold-btn ${config.udiseBold ? "active" : ""}`}
        aria-pressed={Boolean(config.udiseBold)}
        onClick={() => updateConfig({ udiseBold: !config.udiseBold })}
      >
        <strong>B</strong> UDISE Bold {config.udiseBold ? "ON" : "OFF"}
      </button>
    </PositionGroup>
    <PositionGroup title="4. District Position">
      {range("Size", "districtTextSize", 5, 18)}{range("Left", "districtLeft", -50, 400)}{range("Top", "districtTop", -20, 300)}
    </PositionGroup>
    <PositionGroup title="5. Header Band Dimensions" className="header-height-container">
      <div style={{ gridColumn: "span 3" }}>{range("Band Height", "headerHeight", 20, 100)}</div>
    </PositionGroup>
    <div className="color-picker-row header-graphics-row"><label>Header Graphics:</label><div className="color-inputs-inline">
      {config.bgType === "solid" && <HeaderColor label="BG color" value={config.headerColor} onChange={(headerColor) => updateConfig({ headerColor })} />}
      <HeaderColor label="School color" value={config.headerTextColor} onChange={(headerTextColor) => updateConfig({ headerTextColor })} />
      <HeaderColor label="UDISE Text Color" value={value("udiseColor")} showValue onChange={(udiseColor) => updateConfig({ udiseColor })} />
    </div></div>
  </div>;
};

const HeaderColor = ({ label, value, showValue = false, onChange }) => <div className="color-picker-wrapper"><span className="value-display">{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} />{showValue && <span className="color-code">{value.toUpperCase()}</span>}</div>;

export default SchoolTab;
