export const getBackground = (config) => {
  if (config.bgType === "image") return `url(${config.selectedBgImage}) center/cover no-repeat`;
  return config.bgType === "gradient" ? "#ffffff" : config.bgColor;
};

export const createCardStyles = (config) => ({
  school: {
    position: "absolute", left: `${config.schoolNameLeft}px`, top: `${config.schoolNameTop}px`,
    color: config.headerTextColor, fontSize: `${config.schoolNameSize}px`, margin: 0,
    width: `${config.schoolNameWidth || 200}px`, lineHeight: "1.2", fontWeight: 700, textTransform: "uppercase",
  },
  logo: {
    position: "absolute", left: `${Number(config.schoolLogoLeft ?? 10)}px`, top: `${Number(config.schoolLogoTop ?? 6)}px`,
    width: `${Number(config.schoolLogoSize || 52)}px`, height: `${Number(config.schoolLogoSize || 52)}px`,
    borderRadius: "50%", overflow: "hidden", zIndex: 3,
    border: `2px solid ${config.headerTextColor || "#ffffff"}`, backgroundColor: "#ffffff",
  },
  udise: {
    position: "absolute", left: `${config.udiseLeft}px`, top: `${config.udiseTop}px`,
    color: config.udiseColor || config.headerTextColor, opacity: 0.9,
    fontSize: `${config.schoolCodeSize}px`, fontWeight: config.udiseBold ? 800 : 600, whiteSpace: "nowrap",
  },
  district: {
    position: "absolute", left: `${Number(config.districtLeft ?? 120)}px`, top: `${Number(config.districtTop ?? 35)}px`,
    color: config.udiseColor || config.headerTextColor, opacity: 0.9,
    fontSize: `${Number(config.districtTextSize ?? config.schoolCodeSize ?? 10)}px`,
    fontWeight: config.udiseBold ? 800 : 600, whiteSpace: "nowrap",
  },
  photo: {
    position: "absolute", left: `${config.photoBoxLeft}px`, top: `${config.photoBoxTopPos}px`,
    borderColor: config.photoBorderColor, borderStyle: "solid", borderWidth: `${config.photoBorderWidth ?? 2}px`,
    borderRadius: config.photoShape === "round" ? "50%" : "3px",
    width: `${config.photoSize}px`, height: `${config.photoSize}px`, overflow: "hidden",
  },
  name: {
    position: "absolute", left: `${config.studentNameLeft}px`, top: `${config.studentNameTopPos}px`,
    color: config.studentNameColor, fontSize: `${config.studentNameSize}px`, margin: 0, whiteSpace: "nowrap",
    textTransform: config.studentNameUppercase === false ? "lowercase" : "uppercase",
    fontWeight: config.studentNameBold === false ? 400 : 900,
    backgroundColor: config.studentNameBgColor || "transparent",
    padding: config.studentNameBgColor && config.studentNameBgColor !== "transparent"
      ? `${Math.max(0, config.studentNameBgPaddingY ?? 0)}px ${Math.max(0, config.studentNameBgPaddingX ?? 2)}px` : 0,
    lineHeight: 1, borderRadius: config.studentNameBgColor && config.studentNameBgColor !== "transparent" ? "3px" : 0,
  },
  className: {
    position: "absolute", left: `${config.classNameLeft}px`, top: `${config.classNameTopPos}px`,
    color: config.classNameColor || config.studentNameColor, opacity: 0.9, fontWeight: 700,
    fontSize: `${config.classNameSize}px`, whiteSpace: "nowrap", textTransform: "uppercase",
  },
  information: {
    position: "absolute", left: `${config.infoBlockLeft}px`, top: `${config.infoBlockTop}px`,
    fontSize: `${config.infoTextSize}px`, lineHeight: `${config.infoLineHeight || 1.2}`,
    "--info-key-value-gap": `${Number(config.infoKeyValueGap ?? 2)}px`,
  },
  signature: {
    position: "absolute", left: `${config.sigLeft}px`, top: `${config.sigTop}px`,
    color: config.signatureColor || config.studentDetailsColor,
    fontSize: `${config.sigSize || 11}px`, margin: 0, whiteSpace: "nowrap",
  },
});
