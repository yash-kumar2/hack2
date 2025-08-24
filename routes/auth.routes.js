const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User')
const Donor = require('../models/donor');
const Receiver = require('../models/receiver');
//sdf

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * @route POST /api/auth/register
 * @body { name, email, password }
 */
router.post("/register", async (req, res) => {
  try {
    const { name, age, gender, bloodGroup, city, email, phone, password } = req.body;

    if (!name || !age || !gender || !bloodGroup || !city || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check for duplicates
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or phone already registered" });
    }

    const user = new User({ name, age, gender, bloodGroup, city, email, phone, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log(token)

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        city: user.city,
        email: user.email,
        phone: user.phone
      },
      token
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


/**
 * @route POST /api/auth/login
 * @body { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: "Email/Phone and password are required" });
    }
    
   const user = await User.findOne({ email: email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "email or phone not assoisated with any account" });
    }
    console.log(user)

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const [donor, receiver] = await Promise.all([
      Donor.findOne({ user: user._id }),
      Receiver.findOne({ user: user._id })
    ]);

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        city: user.city,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
      token,
      isDonor: !!donor,
      isReceiver: !!receiver
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @route GET /api/auth/me
 * @desc returns the current logged in user
 */
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    res.json({ user: { id: me._id, name: me.name, email: me.email } });
  } catch (err) {
    next(err);
  }
});
router.post("/donor", auth, async (req, res) => {
  try {
    const { lastDonationDate, donationIntervalDays, preferredDonationCenter } = req.body;

    // check if already donor
    const existing = await Donor.findOne({ user: req.user.id });
    if (existing) {
      return res.status(201).json({ message: "User is already registered as a donor" });
    }

    const donor = new Donor({
      user: req.user.id,
      lastDonationDate,
      donationIntervalDays,
      preferredDonationCenter,
      nextEligibleDate: lastDonationDate 
        ? new Date(new Date(lastDonationDate).getTime() + donationIntervalDays * 24 * 60 * 60 * 1000)
        : null
    });

    await donor.save();
    res.status(201).json({ message: "Donor profile created successfully", donor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
router.get("/my-allotments", auth,async (req, res) => {
  try {
    // Step 1: Find receiver linked to logged-in user
    const receiver = await Receiver.findOne({ user: req.user.id });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver profile not found" });
    }

    // Step 2: Find allotments linked to this receiver
    const allotments = await Allotment.find({ receiver: receiver._id })
      .populate("bloodBank", "name city") // optional: show blood bank info
      .populate("receiver", "user")       // optional: show receiver details
      .sort({ createdAt: -1 });           // latest first

    res.json(allotments);
  } catch (err) {
    console.error("Error fetching allotments:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET: fetch all donations by logged-in user
router.get("/my-donations",auth, async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user.id })
      .sort({ createdAt: -1 }); // latest first

    if (!donations || donations.length === 0) {
      return res.status(404).json({ message: "No donations found" });
    }

    res.json(donations);
  } catch (err) {
    console.error("Error fetching donations:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/my-schedules",auth, async (req, res) => {
  try {
    const schedules = await Schedule.find({
      donor: req.user.id,
      completed: false,
      scheduledDate: { $gte: new Date() } // only future dates
    }).sort({ scheduledDate: 1 });

    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ POST a new schedule for logged-in donor
router.post("/create/donation",auth, async (req, res) => {
  try {
    const { scheduledDate, location } = req.body;

    const newSchedule = new Schedule({
      donor: req.user.id,
      scheduledDate,
      location
    });

    await newSchedule.save();

    res.status(201).json(newSchedule);
  } catch (err) {
    console.error("Error creating schedule:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/my-allotments", async (req, res) => {
  try {
    const userId = req.user.id; // assuming you set req.user via auth middleware

    // find all receivers for this user
    const receivers = await Receiver.find({ user: userId }).select("_id");

    // extract receiver IDs
    const receiverIds = receivers.map(r => r._id);

    // find allotments linked to those receivers
    const allotments = await Allotment.find({ receiver: { $in: receiverIds } })
      .populate("receiver")
      .populate("bloodBank");

    res.json(allotments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/receiver/my-info", auth, async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware

    // Find receiver info and populate user details
    const receiver = await Receiver.findOne({ user: userId })
      .populate("user", "-password"); // exclude password field

    if (!receiver) {
      return res.status(404).json({ error: "Receiver info not found" });
    }

    res.json(receiver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// Create Receiver
router.post("/receiver", auth, async (req, res) => {
  try {
    const { transfusionIntervalDays, lastTransfusionDate, requiredUnits } = req.body;

    // check if already receiver
    const existing = await Receiver.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ message: "User is already registered as a receiver" });
    }

    const receiver = new Receiver({
      user: req.user.id,
      transfusionIntervalDays,
      lastTransfusionDate,
      requiredUnits,
      nextDueDate: lastTransfusionDate
        ? new Date(new Date(lastTransfusionDate).getTime() + transfusionIntervalDays * 24 * 60 * 60 * 1000)
        : null
    });

    await receiver.save();
    res.status(201).json({ message: "Receiver profile created successfully", receiver });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


module.exports = router;
