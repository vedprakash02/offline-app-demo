// const dotenv = require("dotenv").config();
const path = require("path");
const crypto = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = crypto;
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = function (buffer) {
    return crypto.randomFillSync(buffer);
  };
}


const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

///// database connection ////
const connectDb = require("./config/database.js");
connectDb();

// Dynamic CORS Settings - यह Tauri और Localhost के सभी पोर्ट्स को एक साथ संभालेगा
app.use(
  cors({
    origin: function (origin, callback) {
      // 1. अगर कोई ओरिजिन नहीं है (जैसे Tauri का Sidecar या Local Request)
      if (!origin) {
        return callback(null, true);
      }

      // 2. जाँच करें कि क्या यह Tauri का अपना यूआरएल है
      const isTauri =
        origin.startsWith('tauri://') ||
        origin.startsWith('http://tauri.localhost') ||
        origin.startsWith('https://tauri.localhost');

      // 3. जाँच करें कि क्या यह Localhost का कोई भी पोर्ट है (जैसे localhost:5173, localhost:5174 आदि)
      const isLocalhost =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      // अगर Tauri है या Localhost का कोई भी पोर्ट है, तो अनुमति दें
      if (isTauri || isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy: This origin is not allowed'));
      }
    },
    credentials: true,               
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200        
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("./license/licenseGuard.js"));
app.use(require("./middleware/auditTrail.js"));
app.use(express.static(path.join(__dirname, "public")));
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));


// Purane static route ko badal kar yeh likhein:
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));


// Router settings
const studentRouts = require("./routes/route.js");
app.use("/", studentRouts);

app.get("/scan", (req, res) => res.sendFile(path.join(frontendDist, "index.html")));

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
