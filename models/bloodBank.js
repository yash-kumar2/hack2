const mongoose = require("mongoose");

const stockEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now }, // collection/storage date
  units: { type: Number, required: true, default: 0 }
}, { _id: false });

const bloodBankSchema = new mongoose.Schema({
  city: { type: String, required: true, unique: true },

  inventory: {
    "A+": [stockEntrySchema],
    "A-": [stockEntrySchema],
    "B+": [stockEntrySchema],
    "B-": [stockEntrySchema],
    "O+": [stockEntrySchema],
    "O-": [stockEntrySchema],
    "AB+": [stockEntrySchema],
    "AB-": [stockEntrySchema]
  },

  nextReceiverDemands: [
    {
      receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "Receiver" },
      dueDate: { type: Date },
      requiredUnits: { type: Number, default: 1 }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("BloodBank", bloodBankSchema);
