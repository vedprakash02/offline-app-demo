import { useRef } from "react";
import ImeTextInput from "./ImeTextInput";
import "./SchoolDetails.css";

const ImagePicker = ({ label, value, previewClassName = "", onSelect }) => {
  const inputRef = useRef(null);

  const readImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result);
    reader.readAsDataURL(file);
  };

  return <div className="school-image-picker">
    <div className={`school-image-preview ${previewClassName}`}>
      {value ? <img src={value} alt={`${label} preview`} /> : <span>No image</span>}
    </div>
    <div className="school-image-picker-text">
      <strong>{label}</strong>
      <small>PNG या JPG image चुनें</small>
    </div>
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={readImage} />
    <button className="school-upload-button" type="button" onClick={() => inputRef.current?.click()}>
      {value ? "Change image" : "Choose image"}
    </button>
  </div>;
};

const SchoolDetails = ({ config, setConfig, onBack, onPreview }) => {
  const setValue = (name, value) => {
    setConfig((previous) => ({ ...previous, [name]: value }));
  };

  return <section className="school-details-page">
    <header className="school-details-heading">
      <div>
        <h3>School Details</h3>
        <p>यह जानकारी ID card पर दिखाई देगी। Hindi के लिए Win + Space से Hindi Phonetic चुनें।</p>
      </div>
      <button className="idc-btn idc-btn-ghost" type="button" onClick={onBack}>Back to editor</button>
    </header>

    <form className="school-details-form" onSubmit={(event) => event.preventDefault()}>
      <div className="school-text-fields">
        <label className="school-detail-field">
          <span>School Name / स्कूल का नाम</span>
          <ImeTextInput value={config.schoolName || ""} onValueChange={(value) => setValue("schoolName", value)}
            placeholder="School name लिखें" inputMode="text" autoCapitalize="none" />
        </label>

        <label className="school-detail-field">
          <span>UDISE Code</span>
          <input value={config.udiseCode || ""} onChange={(event) => setValue("udiseCode", event.target.value)}
            placeholder="UDISE code लिखें" inputMode="numeric" />
        </label>

        <label className="school-detail-field">
          <span>District / जिला</span>
          <ImeTextInput value={config.schoolDistrict || ""} onValueChange={(value) => setValue("schoolDistrict", value)}
            placeholder="District name लिखें" inputMode="text" autoCapitalize="none" />
        </label>
      </div>

      <div className="school-image-fields">
        <ImagePicker label="School Logo / Image" value={config.schoolImage}
          onSelect={(value) => setValue("schoolImage", value)} />
        <ImagePicker label="Principal Signature" value={config.principalSignature} previewClassName="signature-preview"
          onSelect={(value) => setValue("principalSignature", value)} />
      </div>

      <footer className="school-details-actions">
        <button className="idc-btn idc-btn-primary" type="button" onClick={onPreview}>Preview ID card</button>
      </footer>
    </form>
  </section>;
};

export default SchoolDetails;
