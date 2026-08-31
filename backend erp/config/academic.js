const SCHOOL_CLASSES = ["Nursery", "KG1", "KG2", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const EXAMS = ["Quarterly", "Half-Yearly", "Annual"];
const getSubjects = (studentClass, stream = "") => {
  if (["Nursery", "KG1", "KG2"].includes(studentClass)) return ["Hindi", "English", "Mathematics", "Environmental Studies", "Drawing", "Rhymes"];
  if (["1st", "2nd", "3rd", "4th", "5th"].includes(studentClass)) return ["Hindi", "English", "Mathematics", "Environmental Studies", "Computer", "General Knowledge"];
  if (["6th", "7th", "8th"].includes(studentClass)) return ["Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer"];
  if (["9th", "10th"].includes(studentClass)) return ["Hindi", "English", "Maths", "Science", "Social Science", "Sanskrit"];
  const groups = { science: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Hindi"], commerce: ["Accountancy", "Business Studies", "Economics", "English", "Hindi"], arts: ["History", "Geography", "Political Science", "English", "Hindi"] };
  if (stream) return groups[String(stream).toLowerCase()] || [];
  return [...new Set(Object.values(groups).flat())];
};
module.exports = { SCHOOL_CLASSES, EXAMS, getSubjects };

