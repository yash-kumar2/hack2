const mongoose = require("mongoose");

const bloodBankSchema = new mongoose.Schema({
  city: { type: String, required: true, unique: true },
  
  inventory: {
    "A+": { type: Number, default: 0 },
    "A-": { type: Number, default: 0 },
    "B+": { type: Number, default: 0 },
    "B-": { type: Number, default: 0 },
    "O+": { type: Number, default: 0 },
    "O-": { type: Number, default: 0 },
    "AB+": { type: Number, default: 0 },
    "AB-": { type: Number, default: 0 }
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
