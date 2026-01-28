const normalizeKunyomi = (reading: string) => reading.replaceAll(".", "");

export const pickMaskReading = (kunyomi: string[], onyomi: string[]) => {
  const ku = kunyomi?.[0];
  if (ku) return normalizeKunyomi(ku);
  return onyomi?.[0] || "";
};

export const maskExample = (term: string, reading: string, text: string) => {
  if (!text || !reading) return text;
  return text.split(term).join(reading);
};
