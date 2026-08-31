import { PositionGroup, RangeControl } from "./Controls";

const QrTab = ({ config, updateConfig }) => {
  const range = (label, key, min, max) => (
    <RangeControl
      label={label}
      min={min}
      max={max}
      step={1}
      value={Number(config[key])}
      onChange={(value) => updateConfig({ [key]: value })}
    />
  );

  return (
    <div className="tab-content-block">
      <div className="panel-title">QR Code Controls</div>
      <PositionGroup title="QR size and position">
        {range("Size", "qrSize", 24, 100)}
        {range("Left / Right", "qrLeft", 0, config.orientation === "landscape" ? 390 : 190)}
        {range("Up / Down", "qrTop", 0, config.orientation === "landscape" ? 190 : 300)}
      </PositionGroup>
      <p style={{ margin: 0, color: "var(--idc-muted)", fontSize: 12 }}>
        Left / Right value badhane par QR right jayega. Up / Down value badhane par QR neeche jayega.
      </p>
      <button
        className="toolbar-btn qr-reset-button"
        type="button"
        onClick={() => updateConfig(config.orientation === "landscape"
          ? { qrSize: 46, qrLeft: 285, qrTop: 148 }
          : { qrSize: 46, qrLeft: 170, qrTop: 250 })}
      >
        <span className="qr-reset-icon" aria-hidden="true">↺</span>
        <span><strong>Reset QR position</strong><small>Default size aur placement restore karein</small></span>
      </button>
    </div>
  );
};

export default QrTab;
