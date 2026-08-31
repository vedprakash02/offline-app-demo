import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";

const frontendDirectory = resolve(
  process.env.SIRF_FRONTEND_DIR || join(dirname(process.execPath), "frontend-dist"),
);

const contentTypes = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg",
};

export const serveFrontend = async (response, pathname, sendJson) => {
  let file = resolve(frontendDirectory, `.${pathname === "/" ? "/index.html" : pathname}`);
  const isInsideFrontend = file.startsWith(frontendDirectory + sep) || file === join(frontendDirectory, "index.html");
  if (!isInsideFrontend) return sendJson(response, 403, { message: "Forbidden" });

  try {
    if (!(await stat(file)).isFile()) file = join(frontendDirectory, "index.html");
  } catch {
    file = join(frontendDirectory, "index.html");
  }

  try {
    const content = await readFile(file);
    const extension = extname(file);
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      ...(extension === ".html" ? { "Cache-Control": "no-store, max-age=0" } : {}),
    });
    response.end(content);
  } catch {
    sendJson(response, 503, { message: "Frontend build nahi mili. Pehle frontend mein npm run build chalayein." });
  }
};
