const mongoose = require("mongoose");
const User = require("./User");

const donorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  lastDonationDate: { type: Date },
  donationIntervalDays: { type: Number, default: 90 },  // default 3 months
  nextEligibleDate: { type: Date },
  
  preferredDonationCenter: { type: String },
  status: { type: String, enum: ["Active", "Ineligible", "Deferred"], default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Donor", donorSchema);
