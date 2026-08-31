import { ColorControl, PositionGroup, RangeControl } from "./Controls";
import "./StudentTab.css";

const StudentTab = ({ config, updateConfig, cardType = "student" }) => {
  const range = (label, key, min, max, step) => <RangeControl label={label} min={min} max={max} step={step} value={config[key]} onChange={(value) => updateConfig({ [key]: value })} />;
  return <div className="tab-content-block student-tab">
    <section className="student-control-section">
      <div className="student-control-heading"><span>1</span><div><strong>{cardType === "teacher" ? "Teacher Name" : "Student Name"}</strong><small>Name ke sabhi controls</small></div></div>
      <PositionGroup title="Name Size & Position">
        {range("Size", "studentNameSize", 9, 24)}{range("Left", "studentNameLeft", -50, 400)}{range("Top", "studentNameTopPos", -20, 300)}
      </PositionGroup>
      <ColorControl label="Name Font Color:" value={config.studentNameColor} onChange={(studentNameColor) => updateConfig({ studentNameColor })} />
      <div className="student-name-format-controls" aria-label="Student name formatting">
        <button
          type="button"
          className={`student-format-btn ${config.studentNameUppercase !== false ? "active" : ""}`}
          aria-pressed={config.studentNameUppercase !== false}
          onClick={() => updateConfig({ studentNameUppercase: !(config.studentNameUppercase !== false) })}
        >
          {config.studentNameUppercase !== false ? "CAPITAL LETTER" : "small letter"}
        </button>
        <button
          type="button"
          className={`student-format-btn ${config.studentNameBold !== false ? "active" : ""}`}
          aria-pressed={config.studentNameBold !== false}
          onClick={() => updateConfig({ studentNameBold: !(config.studentNameBold !== false) })}
        >
          <strong>B</strong> Bold {config.studentNameBold !== false ? "ON" : "OFF"}
        </button>
      </div>
      <div className="color-picker-row">
        <label>Name Background:</label>
        <div className="color-inputs-inline">
          <button type="button" className="toolbar-btn" onClick={() => updateConfig({ studentNameBgColor: config.studentNameBgColor === "transparent" || !config.studentNameBgColor ? "#ffffff" : "transparent" })}>
            {config.studentNameBgColor === "transparent" || !config.studentNameBgColor ? "Add background" : "Remove background"}
          </button>
          {config.studentNameBgColor && config.studentNameBgColor !== "transparent" && <div className="color-picker-wrapper">
            <input type="color" value={config.studentNameBgColor} onChange={(event) => updateConfig({ studentNameBgColor: event.target.value })} />
            <span className="value-display">{config.studentNameBgColor}</span>
          </div>}
        </div>
      </div>
      {config.studentNameBgColor && config.studentNameBgColor !== "transparent" && <PositionGroup title="Name Background Padding">
        {range("Left / Right", "studentNameBgPaddingX", 0, 8, 0.25)}
        {range("Top / Bottom", "studentNameBgPaddingY", 0, 3, 0.1)}
      </PositionGroup>}
    </section>

    <section className="student-control-section class-control-section">
      <div className="student-control-heading"><span>2</span><div><strong>{cardType === "teacher" ? "Designation" : "Class Name"}</strong><small>{cardType === "teacher" ? "Designation ke controls" : "Class ke sabhi controls"}</small></div></div>
      <PositionGroup title="Class Size & Position">
        {range("Size", "classNameSize", 8, 18)}{range("Left", "classNameLeft", -50, 400)}{range("Top", "classNameTopPos", -20, 300)}
      </PositionGroup>
      <ColorControl label="Class Font Color:" value={config.classNameColor || config.studentNameColor} onChange={(classNameColor) => updateConfig({ classNameColor })} />
    </section>
  </div>;
};

export default StudentTab;

