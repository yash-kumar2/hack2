const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  bloodGroup: { 
    type: String, 
    enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], 
    required: true 
  },
  city: { type: String, required: true }
}, { timestamps: true });
