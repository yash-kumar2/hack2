const express = require("express");
const router = express.Router();
const Schedule = require("../models/schedule");
const Donation = require("../models/donation");
const auth = require("../middleware/auth");

/**
 * @route   GET /api/admin/schedules
 * @desc    Get all pending donation schedules
 * @access  Private (Superadmin)
 */
router.get("/schedules",  async (req, res) => {
  try {
    const schedules = await Schedule.find({ completed: false })
      .populate({
        path: 'donor',
        populate: {
          path: 'user',
          model: 'User'
        }
      })
      .sort({ scheduledDate: 1 });
    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   POST /api/admin/schedules/:id/approve
 * @desc    Approve a schedule and convert it to a donation
 * @access  Private (Superadmin)
 */
router.post("/schedules/:id/approve", auth, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id).populate({
        path: 'donor',
        populate: {
          path: 'user',
          model: 'User'
        }
      });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (schedule.completed) {
      return res.status(400).json({ message: "Schedule already completed" });
    }

    // Create a new donation from the schedule
    const donation = new Donation({
      donorName: schedule.donor.user.name,
      donorId: schedule.donor._id,
      city: schedule.donor.user.city,
      bloodGroup: schedule.donor.user.bloodGroup,
      units: 1, // Assuming 1 unit per donation
      donationDate: schedule.scheduledDate,
    });

    await donation.save();

    // Mark the schedule as completed
    schedule.completed = true;
    await schedule.save();

    res.json({ message: "Schedule approved and donation created", donation });
  } catch (err) {
    console.error("Error approving schedule:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;