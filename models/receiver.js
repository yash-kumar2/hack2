const mongoose = require("mongoose");
const User = require("./user");

const receiverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  transfusionIntervalDays: { type: Number, default: 21 },  // default ~3 weeks
  lastTransfusionDate: { type: Date },
  nextDueDate: { type: Date },
  
  requiredUnits: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model("Receiver", receiverSchema);
