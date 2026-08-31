import { useEffect, useRef, useState } from "react";
import { imageTemplates } from "./templates";
import { deleteCustomTemplate, getCustomTemplates, saveCustomTemplate } from "./customTemplateStore";
import "./Controls.css";
import "./CanvasTab.css";
import { CARD_SIZE_PRESETS, getCardDimensions } from "../cardDimensions";

const gradientPresets = [
  { name: "Royal Blue", colors: ["#1d4ed8", "#60a5fa"] },
  { name: "Purple Dream", colors: ["#6d28d9", "#c084fc"] },
  { name: "Emerald", colors: ["#047857", "#34d399"] },
  { name: "Sunset", colors: ["#c2410c", "#fb7185"] },
  { name: "Ocean", colors: ["#0369a1", "#22d3ee"] },
  { name: "Berry", colors: ["#9d174d", "#f472b6"] },
  { name: "Midnight", colors: ["#111827", "#4f46e5"] },
  { name: "Teal", colors: ["#0f766e", "#2dd4bf"] },
  { name: "Ruby", colors: ["#991b1b", "#ef4444"] },
  { name: "Indigo", colors: ["#3730a3", "#818cf8"] },
  { name: "Forest", colors: ["#14532d", "#65a30d"] },
  { name: "Copper", colors: ["#78350f", "#f59e0b"] },
];

const CanvasTab = ({ config, updateConfig, toggleOrientation }) => {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [templateMessage, setTemplateMessage] = useState("");
  const [canvasDraft, setCanvasDraft] = useState(() => ({
    cardSizePreset: config.cardSizePreset || "cr80",
    customCardWidthMm: config.customCardWidthMm ?? 85.6,
    customCardHeightMm: config.customCardHeightMm ?? 53.98,
    cardSides: "single",
  }));
  const templateInputRef = useRef(null);
  const templateUrlsRef = useRef([]);
  const selectTemplate = (template) => updateConfig({ bgType: "image", selectedBgImage: template.path, selectedCustomTemplateId: null, headerColor: "transparent", ...template.presets });
  const selectGradient = ({ colors }) => updateConfig({ gradientColor1: colors[0], gradientColor2: colors[1] });
  const changeBackgroundType = (bgType) => {
    if (bgType === "gradient") {
      const hasPreset = gradientPresets.some(({ colors }) => colors[0] === config.gradientColor1 && colors[1] === config.gradientColor2);
      updateConfig({ bgType, ...(!hasPreset && { gradientColor1: gradientPresets[0].colors[0], gradientColor2: gradientPresets[0].colors[1] }) });
      return;
    }
    updateConfig({ bgType });
  };

  useEffect(() => {
    let cancelled = false;
    getCustomTemplates()
      .then((savedTemplates) => {
        if (cancelled) return;
        const templatesWithUrls = savedTemplates.map((template) => ({ ...template, url: URL.createObjectURL(template.blob) }));
        templateUrlsRef.current = templatesWithUrls.map((template) => template.url);
        setCustomTemplates(templatesWithUrls);
      })
      .catch(() => setTemplateMessage("Saved templates load nahi ho sake."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config.selectedCustomTemplateId) return;
    const selected = customTemplates.find((template) => template.id === config.selectedCustomTemplateId);
    if (selected && selected.url !== config.selectedBgImage) updateConfig({ selectedBgImage: selected.url });
  }, [config.selectedBgImage, config.selectedCustomTemplateId, customTemplates, updateConfig]);

  const selectCustomTemplate = (template) => updateConfig({
    bgType: "image",
    selectedBgImage: template.url,
    selectedCustomTemplateId: template.id,
    headerColor: "transparent",
  });

  const addCustomTemplate = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTemplateMessage("Sirf PNG, JPG ya image file select karein.");
      return;
    }
    try {
      const savedTemplate = await saveCustomTemplate(file);
      const template = { ...savedTemplate, url: URL.createObjectURL(savedTemplate.blob) };
      templateUrlsRef.current.push(template.url);
      setCustomTemplates((current) => [template, ...current]);
      selectCustomTemplate(template);
      setTemplateMessage(`${template.name} save aur apply ho gaya.`);
    } catch {
      setTemplateMessage("Template save nahi ho saka.");
    }
  };

  const removeSelectedTemplate = async () => {
    const selected = customTemplates.find((template) => template.id === config.selectedCustomTemplateId);
    if (!selected || !window.confirm(`Delete "${selected.name}" template?`)) return;
    try {
      await deleteCustomTemplate(selected.id);
      setCustomTemplates((current) => current.filter((template) => template.id !== selected.id));
      templateUrlsRef.current = templateUrlsRef.current.filter((url) => url !== selected.url);
      URL.revokeObjectURL(selected.url);
      selectTemplate(imageTemplates[0]);
      setTemplateMessage(`${selected.name} delete ho gaya.`);
    } catch {
      setTemplateMessage("Template delete nahi ho saka.");
    }
  };

  return <div className="tab-content-block canvas-tab">
    <div className="panel-title">Card Canvas Configurations</div>
    <div className="toolbar-row">
      <div className="control-group card-size-control">
        <label className="toolbar-label" htmlFor="card-size-preset">Card physical size</label>
        <select id="card-size-preset" className="toolbar-select" value={canvasDraft.cardSizePreset} onChange={(event) => setCanvasDraft((current) => ({ ...current, cardSizePreset: event.target.value }))}>
          {CARD_SIZE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}{preset.id === "custom" ? "" : ` — ${preset.width} × ${preset.height} mm`}</option>)}
        </select>
        {canvasDraft.cardSizePreset === "custom" && <div className="custom-size-fields">
          <label>Width (mm)<input type="number" min="40" max="140" step="0.1" value={canvasDraft.customCardWidthMm} onChange={(event) => setCanvasDraft((current) => ({ ...current, customCardWidthMm: Number(event.target.value) }))} /></label>
          <label>Height (mm)<input type="number" min="40" max="140" step="0.1" value={canvasDraft.customCardHeightMm} onChange={(event) => setCanvasDraft((current) => ({ ...current, customCardHeightMm: Number(event.target.value) }))} /></label>
        </div>}
        <small className="canvas-help">Current {config.orientation}: {getCardDimensions(config).width} × {getCardDimensions(config).height} mm. PDF mein yahi exact size use hoga.</small>
      </div>
      <div className="control-group">
        <label className="toolbar-label" htmlFor="card-sides">Printing sides</label>
        <select id="card-sides" className="toolbar-select" value={canvasDraft.cardSides} onChange={(event) => setCanvasDraft((current) => ({ ...current, cardSides: event.target.value }))}>
          <option value="single">Front only (single side)</option>
        </select>
        <button type="button" className="toolbar-btn apply-canvas-btn" onClick={() => {
          updateConfig(canvasDraft);
          setTemplateMessage("Card size aur side settings preview aur print par apply ho gayi hain.");
        }}>Apply to preview &amp; print</button>
      </div>
      <div className="control-group">
        <label className="toolbar-label">Select Background Type:</label>
        <select className="toolbar-select" value={config.bgType} onChange={(event) => changeBackgroundType(event.target.value)}>
          <option value="solid">Simple Solid Color</option><option value="gradient">Modern Gradient Layout</option><option value="image">Canva PNG Template Mode</option>
        </select>
      </div>
      {config.bgType === "image" && <div className="control-group">
        <label className="toolbar-label">Select Template Base:</label>
        <select className="toolbar-select" value={config.selectedCustomTemplateId ? `custom:${config.selectedCustomTemplateId}` : config.selectedBgImage || ""} onChange={(event) => {
          if (event.target.value.startsWith("custom:")) {
            const template = customTemplates.find((item) => `custom:${item.id}` === event.target.value); if (template) selectCustomTemplate(template);
            return;
          }
          const template = imageTemplates.find((item) => item.path === event.target.value); if (template) selectTemplate(template);
        }}>
          <option value="" disabled>-- Choose Template --</option>
          <optgroup label="Built-in templates">{imageTemplates.map((template) => <option key={template.id} value={template.path}>{template.name}</option>)}</optgroup>
          {customTemplates.length > 0 && <optgroup label="My saved templates">{customTemplates.map((template) => <option key={template.id} value={`custom:${template.id}`}>{template.name}</option>)}</optgroup>}
        </select>
        <input ref={templateInputRef} className="custom-template-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={addCustomTemplate} />
        <div className="custom-template-actions">
          <button type="button" className="toolbar-btn custom-template-btn" onClick={() => templateInputRef.current?.click()}>Save my template</button>
          {config.selectedCustomTemplateId && <button type="button" className="toolbar-btn delete-template-btn" onClick={removeSelectedTemplate}>Delete template</button>}
        </div>
        {templateMessage && <p className="custom-template-message" role="status">{templateMessage}</p>}
      </div>}
      {config.bgType === "solid" && <ColorPicker label="Card Base Color" value={config.bgColor} onChange={(bgColor) => updateConfig({ bgColor })} />}
      {config.bgType === "gradient" && <div className="gradient-presets-group">
        <label className="toolbar-label">Header & Footer Gradient</label>
        <div className="gradient-presets-grid">
          {gradientPresets.map((preset) => {
            const active = preset.colors[0] === config.gradientColor1 && preset.colors[1] === config.gradientColor2;
            return <button key={preset.name} type="button" className={`gradient-preset-btn ${active ? "active" : ""}`} title={preset.name} aria-label={`Use ${preset.name} gradient`} aria-pressed={active} style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` }} onClick={() => selectGradient(preset)}><span>{preset.name}</span></button>;
          })}
        </div>
      </div>}
      <div className="control-group"><label className="toolbar-label">Corner Radius:</label><div className="slider-container-box">
        <input type="range" min="0" max="30" value={config.borderRadius} onChange={(event) => updateConfig({ borderRadius: Number(event.target.value) })} /><span className="value-display">{config.borderRadius}px</span>
      </div></div>
      <div className="control-group"><label className="toolbar-label">Orientation:</label><button type="button" className={`toolbar-btn orientation-toggle ${config.orientation === "landscape" ? "is-landscape" : ""}`} onClick={toggleOrientation}>
        {config.orientation === "portrait" ? "Switch to landscape" : "Switch to portrait"}
      </button></div>
    </div>
  </div>;
};

const ColorPicker = ({ label, value, onChange }) => <div className="color-picker-row">
  {label && <label>{label}</label>}<div className="color-picker-wrapper"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><span className="value-display">{value.toUpperCase()}</span></div>
</div>;

export default CanvasTab;
