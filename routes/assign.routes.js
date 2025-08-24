const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const Donor = require("../models/donor");
const Receiver = require("../models/receiver");
const BloodBank = require("../models/bloodBank");
const auth = require("../middleware/auth");  // middleware to verify JWT
const Schedule = require("../models/schedule");
const Allotment = require("../models/allotment");

// Utility
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// 🔹 Daily assignment function
// async function assignDonorsForCity(city, today = new Date()) {
//   const bloodBank = await BloodBank.findOne({ city });
//   if (!bloodBank) return;

//   const dueReceivers = await Receiver.find({
//     city,
//     nextDueDate: { $lte: addDays(today, 1) }
//   }).populate("user");

//   for (const receiver of dueReceivers) {
//     let requiredUnits = receiver.requiredUnits;

//     // Check inventory
//     if (bloodBank.inventory[receiver.user.bloodGroup] >= requiredUnits) {
//       bloodBank.inventory[receiver.user.bloodGroup] -= requiredUnits;
//       console.log(`✅ Reserved ${requiredUnits} units for ${receiver.user.name}`);
//     } else {
//       const deficit = requiredUnits - bloodBank.inventory[receiver.user.bloodGroup];
//       console.log(`⚠️ Need ${deficit} more units for ${receiver.user.name}`);

//       // Find eligible donors
//       const eligibleDonors = await Donor.find({
//         city,
//         status: "Active",
//         nextEligibleDate: { $lte: today }
//       }).populate("user").sort({ lastDonationDate: 1 });

//       const assignedDonors = eligibleDonors.slice(0, deficit);
//       for (const donor of assignedDonors) {
//         console.log(`📞 Scheduling donor ${donor.user.name} to donate for ${receiver.user.name}`);
//         // Stub: update donor nextEligibleDate
//         donor.lastDonationDate = today;
//         donor.nextEligibleDate = addDays(today, donor.donationIntervalDays);
//         await donor.save();
//       }

//       // Empty out stock after use
//       bloodBank.inventory[receiver.user.bloodGroup] = 0;
//     }
//   }

//   await bloodBank.save();
//   console.log(`✅ Assignment done for ${city} on ${today.toDateString()}`);
// }

async function assignDonorsForCity(city, today = new Date()) {
  const bloodBank = await BloodBank.findOne({ city });
  if (!bloodBank) return;

  const dueReceivers = await Receiver.find({
    city,
    nextDueDate: { $lte: addDays(today, 1) }
  }).populate("user");

  for (const receiver of dueReceivers) {
    let requiredUnits = receiver.requiredUnits;
    let stockArray = bloodBank.inventory[receiver.user.bloodGroup];

    // Sort inventory by date (oldest first)
    stockArray.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Consume oldest stock first
    for (let entry of stockArray) {
      if (requiredUnits === 0) break;

      if (entry.units <= requiredUnits) {
        requiredUnits -= entry.units;
        entry.units = 0; // fully used
      } else {
        entry.units -= requiredUnits;
        requiredUnits = 0;
      }
    }

    // Remove empty entries
    bloodBank.inventory[receiver.user.bloodGroup] = stockArray.filter(e => e.units > 0);

    if (requiredUnits === 0) {
      console.log(`✅ Reserved ${receiver.requiredUnits} units for ${receiver.user.name}`);
    } else {
      console.log(`⚠️ Shortfall: Need ${requiredUnits} more units for ${receiver.user.name}`);

      // Find donors
      const eligibleDonors = await Donor.find({
        city,
        status: "Active",
        nextEligibleDate: { $lte: today }
      }).populate("user").sort({ lastDonationDate: 1 });

      const assignedDonors = eligibleDonors.slice(0, requiredUnits);
      for (const donor of assignedDonors) {
        console.log(`📞 Scheduling donor ${donor.user.name} for ${receiver.user.name}`);
        donor.lastDonationDate = today;
        donor.nextEligibleDate = addDays(today, donor.donationIntervalDays);
        await donor.save();

        // Add donor’s donation to stock (today)
        bloodBank.inventory[donor.user.bloodGroup].push({
          date: today,
          units: 1
        });
      }

      // After donors, try to fulfill again (recursive/loop if you want)
    }
  }

  await bloodBank.save();
  console.log(`✅ Assignment done for ${city} on ${today.toDateString()}`);
}


// 🔹 Daily scheduler (runs at 1am)
cron.schedule("0 1 * * *", async () => {
  console.log("⏰ Running daily donor assignment...");
  const cities = await BloodBank.find().distinct("city");
  for (const city of cities) {
    await assignDonorsForCity(city);
  }
});

// 🔹 Manual trigger route
router.get("/assign", async (req, res) => {
  const cities = await BloodBank.find().distinct("city");
  for (const city of cities) {
    await assignDonorsForCity(city);
  }
  res.json({ message: "Manual assignment done" });
});
router.get("all-scheudules", async (req, res) => {
  try {
    //to find all schedules
    const schedules = await Schedule.findAll()
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Server error" });
  }
});       



// 🔹 Emergency donors (stub function)
router.post("/emergency", async (req, res) => {
  const { city, bloodGroup, requiredUnits } = req.body;

  console.log(`🚨 Emergency request in ${city} for ${requiredUnits} units of ${bloodGroup}`);

  // Stub: just log some eligible donors
  const donors = await Donor.find({
    city,
    status: "Active",
    "user.bloodGroup": bloodGroup
  }).limit(requiredUnits).populate("user");

  res.json({
    message: "Emergency donors contacted",
    donors: donors.map(d => d.user.name)
  });
});
// middleware to verify JWT

// Create Donor




module.exports = router;
