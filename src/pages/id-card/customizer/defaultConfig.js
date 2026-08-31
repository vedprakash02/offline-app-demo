export const defaultConfig = {
  orientation: "portrait", cardSizePreset: "cr80", customCardWidthMm: 85.6, customCardHeightMm: 53.98,
  cardSides: "single", backInstructions: "If found, please return this card to the issuing institution.",
  borderRadius: 8, bgType: "solid", bgColor: "#ffffff",
  gradientColor1: "#1d4ed8", gradientColor2: "#60a5fa", selectedBgImage: "/templates/bg1.png", selectedCustomTemplateId: null,
  headerColor: "#007acc", headerTextColor: "#ffffff", udiseColor: "#ffffff", udiseBold: false, footerColor: "#333333",
  footerHeight: 30, footerText: "Session: 2026-27", footerTextSize: 10, photoBorderColor: "#007acc",
  photoBorderWidth: 2, photoShape: "square", studentNameColor: "#333333", studentNameUppercase: true, studentNameBold: true,
  studentNameBgColor: "transparent", studentNameBgPaddingX: 2, studentNameBgPaddingY: 0, classNameColor: "#333333",
  studentDetailsColor: "#555555", signatureColor: "#333333", schoolNameSize: 13, schoolCodeSize: 10, schoolLogoSize: 52,
  schoolLogoLeft: 10, schoolLogoTop: 6, photoSize: 70, studentNameSize: 13, infoTextSize: 11,
  infoLineHeight: 1.3, infoKeyValueGap: 2, classNameSize: 12, schoolNameLeft: 10, schoolNameTop: 10, schoolNameWidth: 220,
  udiseLeft: 10, udiseTop: 35, districtLeft: 120, districtTop: 35, districtTextSize: 10,
  photoBoxLeft: 15, photoBoxTopPos: 65, studentNameLeft: 100, studentNameTopPos: 65,
  classNameLeft: 100, classNameTopPos: 85, infoBlockLeft: 100, infoBlockTop: 105,
  sigLeft: 100, sigTop: 190, sigSize: 11, sigImageLeft: 120, sigImageTop: 168,
  sigImageWidth: 50, sigImageHeight: 20, schoolName: "", udiseCode: "", schoolDistrict: "", schoolImage: "",
  principalSignature: "", language: "en", qrSize: 46, qrLeft: 170, qrTop: 250,
};

export const emptyStudent = {
  name: "", studentId: "", className: "", fatherName: "",
  motherName: "", dob: "", phone: "", address: "",
};
