import axios from "axios";

const client = axios.create({ baseURL: "http://localhost:3000" });

export const attendanceApi = {
  async getRecords(date) {
    const { data } = await client.get("/attendance-summary", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      params: { date, academicSession: localStorage.getItem("activeSession") },
    });
    return data;
  },
};

