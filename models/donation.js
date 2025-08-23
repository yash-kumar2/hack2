const mongoose = require("mongoose");
const BloodBank = require("./bloodBank"); // import existing model

// Donation schema
const donationSchema = new mongoose.Schema({
  donorName: { type: String, required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: "Donor" }, // optional if you have a Donor model
  city: { type: String, required: true }, // link to blood bank city
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
    required: true
  },
  units: { type: Number, required: true, default: 1 },
  donationDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Middleware: After saving donation, add it into blood bank inventory
donationSchema.post("save", async function(doc, next) {
  try {
    let bloodBank = await BloodBank.findOne({ city: doc.city });
    if (!bloodBank) {
      // If blood bank for this city does not exist, create one
      bloodBank = new BloodBank({ city: doc.city });
    }

    // Push new donation into inventory for that blood group
    bloodBank.inventory[doc.bloodGroup].push({
      date: doc.donationDate,
      units: doc.units
    });

    await bloodBank.save();
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Donation", donationSchema);
