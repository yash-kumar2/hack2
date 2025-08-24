const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", required: true },

  scheduledDate: { type: Date, required: true },

  location: { type: String, required: true },

  completed: { type: Boolean, default: false } // false = upcoming, true = done
}, { timestamps: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
