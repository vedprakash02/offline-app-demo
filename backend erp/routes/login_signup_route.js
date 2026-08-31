const {
  express,
  jwt,
  bcrypt,
  AllowedUser,
  User,
} = require("../config/dependenci.js");
const { getJwtSecret } = require("../config/security.js");

const router = express.Router();

// ==================== SIGNUP ROUTE ====================
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna compulsory hai!"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    if (!cleanUsername || !/^\S+@\S+\.\S+$/.test(cleanEmail) || String(password).length < 8) {
      return res.status(400).json({ success: false, message: "Valid username, email aur kam se kam 8 characters ka password required hai." });
    }

    // Fresh installation: the first account is securely bootstrapped as Admin.
    const isFirstAccount = (await User.countDocuments()) === 0;
    const requestedRole = isFirstAccount ? "admin" : role;
    if (isFirstAccount) {
      await AllowedUser.findOneAndUpdate(
        { email: cleanEmail },
        { username: cleanUsername, email: cleanEmail, role: "admin" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const allowedUser = await AllowedUser.findOne({ email: cleanEmail });
    if (!allowedUser) {
      return res.status(403).json({
        success: false,
        message: "Yeh email master users list me approved nahi hai.",
      });
    }

    if (allowedUser.role !== requestedRole) {
      return res.status(400).json({
        success: false,
        message: `Is email ke liye approved role ${allowedUser.role} hai.`,
      });
    }

    const exitingUser = await User.findOne({ email: cleanEmail });
    if (exitingUser) {
      return res.status(400).json({
        success: false,
        message: "Aap is email se pehle hi account bana chuke hain! Kripya Login karein."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: requestedRole, 
    });
    await newUser.save();

    return res.status(201).json({
      success: true,
      message: isFirstAccount ? "Vidya Prabandh ka pehla Admin account ban gaya. Ab login karein." : "User created successfully! Aapka account ban gaya.",
    });

  } catch (err) {
    console.error("Signup Error: ", err);
    if (err?.code === 11000) return res.status(409).json({ success: false, message: "Is email se account pehle hi bana hua hai." });
    return res.status(500).json({ success: false, message: "Server Error: " + err.message });
  }
});

// ==================== LOGIN ROUTE ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email aur Password zaroori hain!" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: "User nahi mila! Kripya sahi email dalein." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Galat password! Kripya fir se koshish karein." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      getJwtSecret(),
      { expiresIn: "1h" }
    );


    console.log("Login successful for:", user.email);

    // ✅ Electron ke liye sirf JSON response bhejenge, cookie hata di hai
    return res.status(200).json({
      success: true,
      message: "Login successful",
      username: user.username,
      role: user.role,
      token,
      email: user.email,
    
    });
    

  } catch (err) {
    console.error("Login Error: ", err);
    // ✅ Response hamesha JSON format me hi hona chahiye
    return res.status(500).json({ success: false, message: "Server Error: " + err.message });
  }
});

module.exports = router;
