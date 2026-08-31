import React from "react";
import { QRCodeSVG } from "qrcode.react";
import "./IdCardPreview.css";
import { getStudentId, makeAttendanceQrValue } from "./attendanceQr";
import { getCardDimensions } from "./cardDimensions";
import { createCardStyles, getBackground } from "./preview/cardStyles";

const SimpleBarcode = ({ value, width = 120, height = 40 }) => {
  const generateBarcode = (text) => {
    const chars = text.split('').map(char => char.charCodeAt(0));
    const bars = chars.map(code => {
      const binary = code.toString(2).padStart(8, '0');
      return binary.split('').map(bit => bit === '1' ? '█' : ' ').join('');
    }).join(' ');
    return bars;
  };

  const barcode = generateBarcode(value || '');
  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: '12px',
      lineHeight: '1',
      whiteSpace: 'pre',
      letterSpacing: '1px',
      width: `${width}px`,
      height: `${height}px`,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      padding: '2px',
      border: '1px solid #000'
    }}>
      {barcode}
    </div>
  );
};

const fallbackStudent = {
  name: "",
  className: "",
  fatherName: "",
  dob: "",
  phone: "",
  address: "",
};

const hasDevanagari = (value) => /[\u0900-\u097F]/.test(String(value || ""));

const IdCardPreview = ({
  config,
  student = fallbackStudent,
  printable = false,
  side = "front",
}) => {
  const details = { ...fallbackStudent, ...student };
  const hasHindiContent = [
    config.schoolName,
    config.udiseCode,
    config.schoolDistrict,
    config.footerText,
    ...Object.values(details),
  ].some(hasDevanagari);
  const isHindi = config.language === "hi";
  const isTeacher = details.entityType === "teacher";
  const districtLabel = isHindi ? "\u091c\u093f\u0932\u093e" : "Dist.";
  const usesHindiFont = isHindi || hasHindiContent;
  const labels = isHindi
    ? {
        name: "\u0928\u093e\u092e",
        className: "\u0915\u0915\u094d\u0937\u093e",
        father: "\u092a\u093f\u0924\u093e",
        mother: "",
        dob: "\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f",
        phone: "\u092b\u094b\u0928",
        address: "\u092a\u0924\u093e",
        udise: "\u092f\u0942\u0921\u093e\u0908\u0938 \u0915\u094b\u0921",
        principal: "\u0939\u0938\u094d\u0924\u093e\u0915\u094d\u0937\u0930 \u092a\u094d\u0930\u093e\u091a\u093e\u0930\u094d\u092f",
        designation: "\u092a\u0926",
      }
    : {
        name: "Name",
        className: isTeacher ? "Designation" : "Class",
        father: isTeacher ? "Father's Name" : "Father",
        mother: isTeacher ? "" : "Mother",
        dob: "DOB",
        phone: "Mobile No",
        address: "Address",
        udise: "UDISE",
        principal: "Principal Signature",
        designation: "Designation",
      };
  const {
    school: schoolStyle,
    logo: logoStyle,
    udise: udiseStyle,
    district: districtStyle,
    photo: photoBoxStyle,
    name: nameStyle,
    className: classStyle,
    information: infoBlockStyle,
    signature: signatureStyle,
  } = createCardStyles(config);
  const photoSrc = details.photo || "";
  const cardDimensions = getCardDimensions(config);

  const card = (
    <div
      className={`id-card ${printable ? "id-card-print" : "id-card-preview"} ${config.orientation} ${usesHindiFont ? "hindi-card" : ""}`}
      style={{
        "--card-width-mm": `${cardDimensions.width}mm`,
        "--card-height-mm": `${cardDimensions.height}mm`,
        borderRadius: `${config.borderRadius}px`,
        background: getBackground(config),
        position: "relative",
        overflow: "hidden",
      }}
    >
      {config.bgType !== "image" && (
        <div
          className="card-top-bg-band"
          style={{
            background: config.bgType === "gradient"
              ? `linear-gradient(135deg, ${config.gradientColor1}, ${config.gradientColor2})`
              : config.headerColor,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: `${config.headerHeight || (config.orientation === "landscape" ? 45 : 55)}px`,
          }}
        />
      )}
      {config.schoolImage && (
        <div className="school-logo-box" style={logoStyle}>
          <img
            src={config.schoolImage}
            alt="School logo"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      {config.schoolName && <h3 style={schoolStyle}>{config.schoolName}</h3>}
      {config.udiseCode && (
        <small className="udise" style={udiseStyle}>
          {labels.udise}: {config.udiseCode}
        </small>
      )}
      {config.schoolDistrict && (
        <small className="school-district" style={districtStyle}>
          {districtLabel}: {config.schoolDistrict}
        </small>
      )}
      {photoSrc && (
        <div className="photo-box" style={photoBoxStyle}>
          <img
            src={photoSrc}
            alt={details.name || "Student"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      {details.name && (
        <h2 style={nameStyle}>
          {labels.name} - {details.name}
        </h2>
      )}
      {details.className && (
        <span style={classStyle}>
          {labels.className} {details.className}
        </span>
      )}
      <div className="student-info" style={infoBlockStyle}>
        {isTeacher ? (
          <>
            {details.fatherName && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.father}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.fatherName}
                </span>
              </p>
            )}
            {details.dob && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.dob}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.dob}
                </span>
              </p>
            )}
            {details.phone && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.phone}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.phone}
                </span>
              </p>
            )}
            {details.address && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.address}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.address}
                </span>
              </p>
            )}
          </>
        ) : (
          <>
            {details.fatherName && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.father}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.fatherName}
                </span>
              </p>
            )}
            {details.dob && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.dob}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.dob}
                </span>
              </p>
            )}
            {details.phone && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.phone}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.phone}
                </span>
              </p>
            )}
            {details.address && (
              <p>
                <strong style={{ color: config.studentDetailsColor }}>
                  {labels.address}:
                </strong>
                <span style={{ color: config.studentDetailsColor }}>
                  {details.address}
                </span>
              </p>
            )}
          </>
        )}
      </div>
      {config.principalSignature && (
        <>
          <img
            className="principal-signature-image"
            src={config.principalSignature}
            alt="Principal signature"
            style={{
              position: "absolute",
              left: `${Number(config.sigImageLeft ?? 120)}px`,
              top: `${Number(config.sigImageTop ?? 168)}px`,
              width: `${Number(config.sigImageWidth ?? 50)}px`,
              height: `${Number(config.sigImageHeight ?? 20)}px`,
              objectFit: "contain",
              zIndex: 2,
            }}
          />
          <div className="principal-signature" style={signatureStyle}>
            <p>
              <strong>{labels.principal}</strong>
            </p>
          </div>
        </>
      )}
      {details.name && (
        <div className="attendance-qr" style={{ left: `${Number(config.qrLeft ?? 170)}px`, top: `${Number(config.qrTop ?? 250)}px`, width: `${Number(config.qrSize ?? 46) + 4}px` }} title={`${isTeacher ? "Employee" : "Student"} ID: ${getStudentId(details)}`}>
          {isTeacher ? (
            <SimpleBarcode value={getStudentId(details)} width={Number(config.qrSize ?? 46) + 20} height={Number(config.qrSize ?? 46)} />
          ) : (
            <QRCodeSVG value={makeAttendanceQrValue(details)} size={Number(config.qrSize ?? 46)} level="M" marginSize={1} />
          )}
          <small>{getStudentId(details)}</small>
        </div>
      )}
      <div
        className="card-footer-band"
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${Number(config.footerHeight ?? 30)}px`,
          background: config.bgType === "gradient"
            ? `linear-gradient(135deg, ${config.gradientColor1}, ${config.gradientColor2})`
            : config.footerColor || "#333333",
          fontSize: `${Number(config.footerTextSize ?? 10)}px`,
        }}
      >
        {config.footerText}
      </div>
    </div>
  );

  const backCard = (
    <div
      className={`id-card id-card-back ${printable ? "id-card-print" : "id-card-preview"} ${config.orientation}`}
      style={{
        "--card-width-mm": `${cardDimensions.width}mm`,
        "--card-height-mm": `${cardDimensions.height}mm`,
        borderRadius: `${config.borderRadius}px`,
        background: getBackground(config),
      }}
    >
      <div className="back-card-header" style={{ background: config.bgType === "gradient" ? `linear-gradient(135deg, ${config.gradientColor1}, ${config.gradientColor2})` : config.headerColor }}>
        {config.schoolImage && <img src={config.schoolImage} alt="" />}
        <strong>{config.schoolName || "INSTITUTION ID CARD"}</strong>
      </div>
      <div className="back-card-content">
        <p>{config.backInstructions || "If found, please return this card to the issuing institution."}</p>
        {details.name && <div className="back-card-qr">
          {isTeacher ? (
            <SimpleBarcode value={getStudentId(details)} width={120} height={40} />
          ) : (
            <QRCodeSVG value={makeAttendanceQrValue(details)} size={54} level="M" marginSize={1} />
          )}
          <small>{getStudentId(details)}</small>
        </div>}
      </div>
      <div className="back-card-footer" style={{ background: config.footerColor || "#333333" }}>{config.footerText}</div>
    </div>
  );

  if (printable) return side === "back" ? backCard : card;
  return (
    <aside className="preview-panel" aria-label="ID card live preview">
      <div className="preview-stage">
        <div className="preview-stage-grid" aria-hidden="true" />
        <div className={`preview-card-sides ${config.cardSides === "double" ? "is-double" : ""}`}>
          {card}
          {config.cardSides === "double" && backCard}
        </div>
      </div>
    </aside>
  );
};

export default IdCardPreview;


