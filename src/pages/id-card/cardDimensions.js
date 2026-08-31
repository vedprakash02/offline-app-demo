export const CARD_SIZE_PRESETS = [
  { id: "cr80", label: "PAN / ATM (CR80)", width: 85.6, height: 53.98 },
  { id: "standard", label: "Standard ID", width: 90, height: 60 },
  { id: "badge", label: "Office badge", width: 88, height: 55 },
  { id: "large", label: "Large institute", width: 100, height: 70 },
  { id: "custom", label: "Custom size", width: 85.6, height: 53.98 },
];

const safeDimension = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(140, Math.max(40, number)) : fallback;
};

export const getCardDimensions = (config = {}) => {
  const preset = CARD_SIZE_PRESETS.find(({ id }) => id === config.cardSizePreset) || CARD_SIZE_PRESETS[0];
  const baseWidth = preset.id === "custom" ? safeDimension(config.customCardWidthMm, preset.width) : preset.width;
  const baseHeight = preset.id === "custom" ? safeDimension(config.customCardHeightMm, preset.height) : preset.height;
  return config.orientation === "portrait"
    ? { width: baseHeight, height: baseWidth }
    : { width: baseWidth, height: baseHeight };
};

export const getPrintLayout = (config = {}) => {
  const { width, height } = getCardDimensions(config);
  const pageWidth = 198; // A4 width minus the two 6 mm page margins.
  const pageHeight = 285; // A4 height minus the two 6 mm page margins.
  const gap = 4;
  const columns = Math.max(1, Math.floor((pageWidth + gap) / (width + gap)));
  const rows = Math.max(1, Math.floor((pageHeight + gap) / (height + gap)));
  return { width, height, gap, columns, rows, cardsPerPage: columns * rows };
};
