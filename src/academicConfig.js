export const SCHOOL_CLASSES = ["Nursery", "KG1", "KG2", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
export const STREAMS = ["science", "arts", "commerce"];
export const EXAMS = ["Quarterly", "Half-Yearly", "Annual"];
export const SUMMARY_EXAMS = ["Quarterly", "Half-Yearly", "Annual"];
export const EXAM_MAX_MARKS = {
  "Unit Test 1": { theory: 20, practical: 0, label: "Unit Test 1 (20 marks)" },
  "Quarterly": { theory: 75, practical: 0, label: "Quarterly (75 marks)" },
  "Half-Yearly": { theory: 75, practical: 0, label: "Half-Yearly (75 marks)" },
  "Annual": { theory: 75, practical: 30, label: "Annual (75+30 marks)" },
};

const primary = ["Hindi", "English", "Mathematics", "Environmental Studies", "Computer", "General Knowledge"];
const middle = ["Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer"];
export const getSubjects = (studentClass, stream = "") => {
  if (["Nursery", "KG1", "KG2"].includes(studentClass)) return ["Hindi", "English", "Mathematics", "Environmental Studies", "Drawing", "Rhymes"];
  if (["1st", "2nd", "3rd", "4th", "5th"].includes(studentClass)) return primary;
  if (["6th", "7th", "8th"].includes(studentClass)) return middle;
  if (["9th", "10th"].includes(studentClass)) return ["Hindi", "English", "Maths", "Science", "Social Science", "Sanskrit"];
  const groups = {
    science: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Hindi"],
    commerce: ["Accountancy", "Business Studies", "Economics", "English", "Hindi"],
    arts: ["History", "Geography", "Political Science", "English", "Hindi"],
  };
  return groups[stream.toLowerCase()] || [];
};
