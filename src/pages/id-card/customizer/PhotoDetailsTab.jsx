import { ColorControl, PositionGroup, RangeControl } from "./Controls";
import "./PhotoDetailsTab.css";

const PhotoDetailsTab = ({ config, updateConfig }) => {
  const value = (key, fallback) => config[key] ?? fallback;
  const range = (label, key, min, max, fallback, suffix = "px", step) => <RangeControl label={label} min={min} max={max} step={step} value={value(key, fallback)} suffix={suffix} onChange={(nextValue) => updateConfig({ [key]: nextValue })} />;
  return <div className="tab-content-block photo-details-tab">
    <div className="panel-title">Frames & Layout Customizer</div>
    <PositionGroup title="1. Student Photo Box">
      {range("Scale", "photoSize", 50, 120, undefined, "%")}{range("Left", "photoBoxLeft", -50, 400)}{range("Top", "photoBoxTopPos", -20, 300)}{range("Border Thickness", "photoBorderWidth", 0, 10, 2)}
      <div className="slider-item-wrapper inline-frame-configs"><div className="frame-stup"><span>Image Frame:
        <select className="toolbar-select frame-select" value={config.photoShape} onChange={(event) => updateConfig({ photoShape: event.target.value })}><option value="square">Square</option><option value="round">Circle</option></select>
      </span><div className="color-picker-wrapper ring-picker"><span className="value-display">Image Border Color</span><input type="color" value={config.photoBorderColor} onChange={(event) => updateConfig({ photoBorderColor: event.target.value })} /></div></div></div>
    </PositionGroup>
    <PositionGroup title="2. Student Info Details Block">
      {range("Font", "infoTextSize", 8, 16)}{range("Line Height", "infoLineHeight", 1, 2, 1.2, "", 0.1)}{range("Key-Value Gap", "infoKeyValueGap", 0, 30, 2)}{range("Left", "infoBlockLeft", -50, 400)}{range("Top", "infoBlockTop", -20, 300)}
      <div className="slider-item-wrapper inline-frame-configs text-color-align"><div className="color-picker-wrapper text-color-box"><input type="color" value={config.studentDetailsColor} onChange={(event) => updateConfig({ studentDetailsColor: event.target.value })} /><span className="value-display">Text Color</span></div></div>
    </PositionGroup>
    <PositionGroup title="3. Principal Signature Block">
      {range("Font", "sigSize", 6, 20, 11)}{range("Left", "sigLeft", -50, 400)}{range("Top", "sigTop", -20, 300)}{range("Image Width", "sigImageWidth", 10, 120, 50)}{range("Image Height", "sigImageHeight", 8, 80, 20)}{range("Image Left", "sigImageLeft", -50, 400, 120)}{range("Image Top", "sigImageTop", -20, 300, 168)}
      <div className="slider-item-wrapper inline-frame-configs signature-color-config"><div className="color-picker-wrapper"><span className="value-display">Signature Font Color</span><input type="color" value={config.signatureColor || "#333333"} onChange={(event) => updateConfig({ signatureColor: event.target.value })} /></div></div>
    </PositionGroup>
    <PositionGroup title="4. Bottom Footer Band Dimensions" className="footer-height-container"><div style={{ gridColumn: "span 3" }}>{range("Band Height", "footerHeight", 10, 80, 30)}</div></PositionGroup>
    {config.bgType !== "gradient" && <ColorControl label="Bottom Footer Band Color:" value={config.footerColor} onChange={(footerColor) => updateConfig({ footerColor })} />}
    <div className="color-picker-row"><label htmlFor="footer-text">Footer text:</label><input id="footer-text" className="toolbar-select" type="text" value={config.footerText ?? ""} placeholder="e.g. Session: 2026-27" onChange={(event) => updateConfig({ footerText: event.target.value })} /></div>
    <PositionGroup title="5. Footer Text Size" className="footer-text-size-container"><div style={{ gridColumn: "span 3" }}>{range("Font size", "footerTextSize", 6, 24, 10)}</div></PositionGroup>
  </div>;
};

export default PhotoDetailsTab;
