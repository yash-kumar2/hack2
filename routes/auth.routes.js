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

    const user = await User.findOne({ $or: [{ email }, { phone }] }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // check donor/receiver status
    const donor = await Donor.findOne({ user: user._id });
    const receiver = await Receiver.findOne({ user: user._id });

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
        phone: user.phone
      },
      token,
      isDonor: donor ? true : false,
      isReceiver: receiver ? true : false
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
      return res.status(400).json({ message: "User is already registered as a donor" });
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
