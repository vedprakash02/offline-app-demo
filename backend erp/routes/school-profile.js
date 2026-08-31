const { express, uploadImage, SchoolProfile, auth } = require("../config/dependenci.js");

const router = express.Router();

router.get("/get-school-profile", auth, async (req, res) => {
  try {
    const userId = req.user.id; // auth middleware se ID mili

    const profile = await SchoolProfile.findOne({ userId });

    if (!profile) {
      return res
        .status(404)
        .json({ message: "Profile nahi mili, kripya pehle create karein." });
    }

    // Agar profile mil gayi toh send kar do
    return res.status(200).json(profile);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return res.status(500).json({ message: "Server Error: " + error.message });
  }
});

router.post("/save-school-profile",
  auth,
  uploadImage.fields([
    { name: "schoolImage", maxCount: 1 },
    { name: "schoolSignature", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role; 

      if (!userId) {
        return res.status(400).json({
          message: "Validation Error: userId ya teacherId missing hai.",
        });
      }

      if (userRole !== "teacher" && userRole !== "admin") {
        return res.status(403).json({
          message: "Permission Denied: Aap school profile save nahi kar sakte.",
        });
      }

      const { schoolName, schoolCode, sansthacode, address, block, dist, phone } = req.body;
      console.log(req.body);

      const imageFilename = req.files && req.files["schoolImage"] 
        ? req.files["schoolImage"][0].filename 
        : null;

      const signatureFilename = req.files && req.files["schoolSignature"] 
        ? req.files["schoolSignature"][0].filename 
        : null;

      // Note: Ensure SchoolProfile model is properly imported at the top
      let profile = await SchoolProfile.findOne({ userId });

      if (profile) {
        // 1. UPDATE PROFILE: Agar pehle se hai toh update karein
        profile = await SchoolProfile.findOneAndUpdate(
          { userId },
          {
            schoolName,
            schoolCode,
            sansthacode,
            address,
            block, // ✅ Yeh sahi se update hoga
            dist, // ✅ Yeh bhi sahi se update hoga
            phone,
            schoolImage: imageFilename ? imageFilename : profile.schoolImage,
            schoolSignature: signatureFilename ? signatureFilename : profile.schoolSignature,
          },
          { returnDocument: "after" }, 
        );

        return res
          .status(200)
          .json({ message: "Profile updated successfully!", profile });
      }

      // 2. CREATE PROFILE: Agar pehle se nahi hai toh naya banayein
      profile = new SchoolProfile({
        userId,
        schoolName,
        schoolCode,
        sansthacode,
        phone,
        address,
        block, // ✅ UPDATE: Ab naye profile me bhi block save hoga
        dist, // ✅ UPDATE: Ab naye profile me bhi state save hoga
        schoolImage: imageFilename || "",
        schoolSignature: signatureFilename || "",
      });

      await profile.save();
      return res
        .status(201)
        .json({ message: "Profile saved successfully!", profile });
    } catch (error) {
      console.error("Profile Save Error:", error);
      return res
        .status(500)
        .json({ message: "Server Error: " + error.message });
    }
  },
);

module.exports = router;
