const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const Receiver = require("./models/receiver");
const Donor = require("./models/donor");

// Init Gemini via LangChain
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-pro", // or gemini-1.5-pro if available
  apiKey: process.env.GOOGLE_API_KEY
});


const classifyPrompt = `
You are a helpful assistant for thalassemia patients.
Classify the user message into one of 5 categories:
1. Emergency blood need (urgent transfusion today/tomorrow)
2. Normal blood need (patient wants to set/update next transfusion date)
3. Frequently asked question (general info about thalassemia or donation)
4. Emotional support (patient is feeling sad or needs motivation)
5. Immediate medical attention (patient shows unusual symptoms or needs urgent medical care beyond blood transfusion)

Return ONLY the number (1, 2, 3, 4, or 5).
`;

async function classifyMessage(userMessage) {
  const response = await model.invoke([
    ["system", classifyPrompt],
    ["human", userMessage]
  ]);
  return response.content.trim();
}

// 🔹 Emergency donor finder (Case 1)
// async function handleEmergency(city, bloodGroup, requiredUnits) {
//   const donors = await Donor.find({
//     city,
//     status: "Active",
//     nextEligibleDate: { $lte: new Date() }
//   }).populate("user").limit(requiredUnits);

//   // Simulate notifying donors
//   donors.forEach(d => {
//     console.log(`📩 Emergency message sent to donor ${d.user.name}`);
//   });

//   return { message: "Emergency donors contacted", donors: donors.map(d => d.user.name) };
// }
async function handleEmergency(city, bloodGroup, requiredUnits) {
  const bank = await BloodBank.findOne({ city });

  if (!bank) return "No blood bank found in your city.";

  let availableUnits = bank.inventory[bloodGroup]?.reduce((sum, entry) => sum + entry.units, 0) || 0;

  if (availableUnits < requiredUnits) {
    return `Sorry, only ${availableUnits} units of ${bloodGroup} available in ${city}. Please contact customer care for alternatives.`;
  }

  // ✅ Use oldest blood greedily
  let needed = requiredUnits;
  for (let entry of bank.inventory[bloodGroup]) {
    if (needed === 0) break;

    let take = Math.min(entry.units, needed);
    entry.units -= take;
    needed -= take;
  }

  await bank.save();
  return `✅ Emergency handled. ${requiredUnits} units of ${bloodGroup} have been allocated from ${city} blood bank.`;
}
// 🔹 Normal scheduling (Case 2)
async function handleNormalBloodNeed(receiverId, newDate) {
  const receiver = await Receiver.findById(receiverId).populate("user");
  if (!receiver) throw new Error("Receiver not found");

  receiver.nextDueDate = new Date(newDate);
  await receiver.save();

  console.log(`📅 Updated next transfusion for ${receiver.user.name} to ${newDate}`);
  return { message: `Next transfusion date set to ${newDate}` };
}

// 🔹 Chatbot main function
async function chatbot(userMessage, context = {}) {
  const classification = await classifyMessage(userMessage);

  switch (classification) {
    case "1":
      return await handleEmergency(context.city, context.bloodGroup, context.requiredUnits || 1);
    case "2":
      return await handleNormalBloodNeed(context.receiverId, context.nextDueDate);
    case "3":
      console.log("ℹ️ FAQ detected. Stub response here.");
      return { message: "This is an FAQ response (stub)." };
    case "4":
      console.log("💙 Emotional support detected. Stub response here.");
      return { message: "Connecting you with a supportive community (stub)." };
    default:
      return { message: "Sorry, I couldn’t classify your request." };
  }
}

module.exports = chatbot;
