const SUBJECT_ORDER = ["Hindi", "English", "Maths", "Science", "So.Science", "Sanskrit"];
const asNumber = (value) => (value === "" ? 0 : Number(value || 0));

export const getSubjectTotal = (subject) => subject.total != null ? Number(subject.total) : asNumber(subject.theory) + asNumber(subject.practical);
export const isSupplementary = (subject) => getSubjectTotal(subject) < 33;
export const orderSubjects = (subjects = []) => [...subjects].sort((a, b) => {
  const aIndex = SUBJECT_ORDER.indexOf(a.subjectName);
  const bIndex = SUBJECT_ORDER.indexOf(b.subjectName);
  return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
});

export const calculateReport = (student, subjects) => {
  let grandTotal = 0;
  const calculatedMarks = subjects.map((subjectName) => {
    const score = student.marks?.[subjectName] || {};
    const theory = asNumber(score.theoryMarks);
    const practical = asNumber(score.practicalMarks);
    const total = theory + practical;
    grandTotal += total;
    return { subjectName, theory: score.theoryMarks, practical: score.practicalMarks, total };
  });
  const maxTotal = subjects.length * 100;
  const percentage = maxTotal ? ((grandTotal / maxTotal) * 100).toFixed(1) : 0;
  return { ...student, personalDetails: student, calculatedMarks, grandTotal, maxTotal, percentage, result: percentage >= 33 ? "PASSED" : "FAILED" };
};

export const getMarksTotals = (subjects = [], supplementaryMarks = {}) => subjects.reduce((totals, subject) => {
  totals.theory += asNumber(subject.theory);
  totals.practical += asNumber(subject.practical);
  totals.grand += getSubjectTotal(subject);
  if (isSupplementary(subject)) {
    totals.supplementaryMax += 100;
    totals.supplementaryObtained += Number(supplementaryMarks[subject.subjectName]) || 0;
  }
  return totals;
}, { theory: 0, practical: 0, grand: 0, supplementaryMax: 0, supplementaryObtained: 0 });

export const numberToWords = (value) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const toHundreds = (number) => {
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
    return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${toHundreds(number % 100)}` : ""}`;
  };
  const number = Math.floor(Number(value) || 0);
  if (number === 0) return "Zero";
  if (number < 1000) return toHundreds(number);
  if (number < 100000) return `${toHundreds(Math.floor(number / 1000))} Thousand${number % 1000 ? ` ${toHundreds(number % 1000)}` : ""}`;
  return String(number);
};
