import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const usersSheet = XLSX.utils.json_to_sheet([
      { username: "Ravi Kumar", email: "ravi.teacher@school.com", role: "teacher" },
    ], { header: ["username", "email", "role"] });
    usersSheet["!cols"] = [{ wch: 24 }, { wch: 34 }, { wch: 16 }];
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ["Master Users Upload Instructions"],
      ["Required columns", "username, email, role"],
      ["Allowed roles", "admin, principal, teacher, accountant, operator, student"],
      ["Teacher login", "Use role exactly as: teacher"],
      ["Important", "Email unique hona chahiye. Header names ko change na karein."],
      ["Signup", "Upload ke baad user isi email se signup/register kar sakta hai."],
    ]);
    instructionsSheet["!cols"] = [{ wch: 22 }, { wch: 72 }];
    XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
    XLSX.writeFile(workbook, "master-users-template.xlsx");
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]); // Pehli select ki gayi file ko state me rakhein
    setStatusMessage({ type: "", text: "" });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Kripya pehle ek Excel file select karein!");
      return;
    }

    // Excel file ko backend tak bhejne ke liye FormData object compulsory hai
    const formData = new FormData();
    formData.append("file", file); // Yeh 'file' naam aapke backend multer .single("file") se match hota hai

    const token = localStorage.getItem("token"); // Auth token check

    setLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const response = await axios.post("http://localhost:3000/upload-master-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": token ? `Bearer ${token}` : "" // Agar admin auth route hai toh token jayega
        },
      });

      if (response.data.success) {
        setStatusMessage({
          type: "success",
          text: response.data.message || "Excel data successfully upload ho gaya!"
        });
        setFile(null); // File field ko reset karne ke liye
        e.target.reset(); // HTML input field reset
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || "Excel processing me koi dikkat aayi."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marks-container" style={{ maxWidth: "550px", margin: "40px auto" }}>
      <h2 className="marks-title" style={{ fontSize: "22px", marginBottom: "15px" }}>
        Upload Master Users List
      </h2>
      <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "20px", textAlign: "center" }}>
        Sirf wahi bache ya teachers portal par register/signup kar payenge jinki list aap yahan excel ke zariye upload karenge.
      </p>

      <button
        type="button"
        className="btn-submit"
        onClick={downloadTemplate}
        style={{ margin: "0 0 16px", width: "100%", backgroundColor: "#0f766e" }}
      >
        Download Excel Template (.xlsx)
      </button>
      <p style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "18px", textAlign: "center" }}>
        Required columns: <strong>username, email, role</strong>. Naye teacher ke liye role me <strong>teacher</strong> likhein.
      </p>

      <form onSubmit={handleFormSubmit} className="filter-panel" style={{ marginBottom: "0px" }}>
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", marginBottom: "8px" }}>Select Excel Sheet (.xlsx, .xls)</label>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange} 
            className="form-control"
            style={{ padding: "12px" }}
          />
        </div>

        <button 
          type="submit" 
          className="btn-submit" 
          style={{ margin: "0", width: "100%" }}
          disabled={loading || !file}
        >
          {loading ? "Processing Excel Rows..." : "Upload Master Excel Data"}
        </button>
      </form>

      {/* Upload ka Status Message Layer */}
      {statusMessage.text && (
        <div 
          className="empty-state" 
          style={{ 
            marginTop: "20px", 
            border: `1px solid ${statusMessage.type === "success" ? "#10b981" : "#ef4444"}`,
            backgroundColor: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: statusMessage.type === "success" ? "#10b981" : "#ef4444",
            fontWeight: "600"
          }}
        >
          {statusMessage.text}
        </div>
      )}
     <button 
  className="btn-back" 
  style={{ 
    marginTop: "20px", 
    width: "100%",
    padding: "12px",                  /* 💡 Button ko thoda mautu/bada karne ke liye */
    backgroundColor: "#4b5563",       /* 💡 Dark Gray Premium Background */
    color: "#ffffff",                 /* 💡 White Text (Taaki saaf dikhe) */
    border: "none",
    borderRadius: "6px",              /* 💡 Smooth corners */
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "block",                 /* 💡 Screen par sahi jagah lene ke liye */
    textAlign: "center"
  }}
  onClick={() => window.history.back()}
>
  ← Back to Dashboard
</button>

    </div>
  );
};

export default ExcelUpload;

