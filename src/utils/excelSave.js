import * as XLSX from "xlsx-js-style";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

const isTauriDesktop = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const saveExcelWorkbook = async (workbook, fileName, options = {}) => {
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array", ...options });

  if (isTauriDesktop()) {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
    });
    if (!path) return { saved: false, cancelled: true };
    await writeFile(path, new Uint8Array(data));
    return { saved: true, path };
  }

  if (typeof window.showSaveFilePicker !== "function") {
    XLSX.writeFile(workbook, fileName, options);
    return { saved: true, path: fileName, fallback: true };
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: "Excel Workbook", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    await writable.close();
    return { saved: true, path: handle.name };
  } catch (error) {
    if (error?.name === "AbortError") return { saved: false, cancelled: true };
    throw error;
  }
};