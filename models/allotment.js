const mongoose = require("mongoose");

const Receiver = require("./receiver");
const BloodBank = require("./bloodBank");

const allotmentSchema = new mongoose.Schema({
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "Receiver", required: true },
  
  bloodBank: { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank", required: true },

  unitsAllotted: { type: Number, required: true },
  allotmentDate: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ["Pending", "Completed", "Cancelled"],
    default: "Completed"
  }
}, { timestamps: true });
