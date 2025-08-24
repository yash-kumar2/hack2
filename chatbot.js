// Add this line at the very top to load environment variables
import 'dotenv/config'; 

// FIXED: The imported class name is GoogleGenerativeAI
import {  GoogleGenerativeAI } from "@google/generative-ai";
import BloodBank from "./models/bloodBank.js";
import Receiver from "./models/receiver.js";

// FIXED: Pass the API key directly to the constructor
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Optimization: Get the model once and reuse it
const classificationModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// ===================================================================================
// 🔹 1. KNOWLEDGE BASE FOR RETRIEVAL-AUGMENTED GENERATION (RAG)
// This object acts as a static "database" for our retrieval step.
// ===================================================================================
const knowledgeBase = {
    emergency: {
        keywords: ["need blood", "urgent", "asap", "emergency", "today", "now", "immediately"],
        description: "This category is for users who require a blood transfusion urgently, typically within the next 24-48 hours, but are not expressing other severe medical symptoms."
    },
    normal: {
        keywords: ["schedule", "appointment", "next transfusion", "set a date", "update my date", "book"],
        description: "This category is for routine scheduling of a future blood transfusion. The user is not in immediate distress."
    },
    faq: {
        keywords: ["what is", "how to", "information", "thalassemia", "donate blood", "can I", "symptoms of"],
        description: "This category covers general questions about thalassemia, blood donation procedures, eligibility, or the chatbot's functions."
    },
    emotional_support: {
        keywords: ["sad", "scared", "worried", "depressed", "feeling down", "anxious", "coping"],
        description: "This category is for users expressing emotional distress, sadness, or anxiety related to their condition. They need empathetic support, not medical or logistical help."
    },
    medical_attention: {
        keywords: ["fever", "pain", "dizzy", "fainting", "shortness of breath", "chest pain", "severe weakness", "unusual symptoms"],
        description: "This is the highest priority category. It's for users describing alarming medical symptoms beyond the standard need for blood. This includes high fever, severe pain, dizziness, etc. This category overrides the 'Emergency' category if symptoms are mentioned alongside a blood request."
    }
};

// ===================================================================================
// 🔹 2. RETRIEVAL FUNCTION
// This function mimics the "Retrieval" step in RAG by finding relevant
// context from our knowledge base based on the user's message.
// ===================================================================================
function retrieveContext(userMessage) {
    const message = userMessage.toLowerCase();
    let foundContext = "No specific context found.";

    for (const key in knowledgeBase) {
        const category = knowledgeBase[key];
        if (category.keywords.some(keyword => message.includes(keyword))) {
            foundContext = `The user's message seems related to the '${key}' category. Description: ${category.description}`;
            break; // Stop after the first match for simplicity
        }
    }
    return foundContext;
}

// ===================================================================================
// 🔹 3. ENHANCED CLASSIFICATION PROMPT & FUNCTION
// This prompt incorporates the RAG context and conversation history.
// ===================================================================================
const enhancedClassifyPromptTemplate = `
You are a highly intelligent and empathetic classification assistant for a Thalassemia patient support chatbot.
Your task is to analyze the user's latest message, considering the conversation history and relevant contextual information, and classify it into ONE of the five categories below.

--- CATEGORIES ---
1. Urgent Blood Logistics
(Previously: Emergency blood need)

Core Intent: The user's primary goal is to solve the logistics of an immediate blood transfusion (within the next 48 hours). The tone is urgent but focused on action, not on describing a medical crisis.

Key Indicators & Keywords:

Urgency: "Urgent," "ASAP," "immediately," "emergency," "today," "tomorrow."

Action-Oriented: "Need blood," "arrange transfusion," "find donor," "blood required for..."

Clinical but Stable: Mentions a low hemoglobin (Hb) level (e.g., "Hb is 7," "hemoglobin dropped") but does not pair it with other severe symptoms from category 5. May mention common low-Hb symptoms like "very tired," "weak," or "pale."

Example User Prompts:

"I urgently need one unit of O+ blood for my transfusion tomorrow morning."

"My daughter's Hb has dropped to 6.8 g/dL. The doctor said she needs a transfusion immediately. Can you help find a donor?"

"Emergency blood requirement for a thalassemia patient at City Hospital. B-negative needed by tonight."

"Feeling extremely weak and pale. My scheduled transfusion isn't for a week but I think I need it now."

Key Distinction: This category is differentiated from #5 (Immediate Medical Attention) by the absence of "red flag" symptoms like high fever, chest pain, or fainting. The problem is logistical, not an acute medical emergency.

2. Routine Scheduling & Management
(Previously: Normal blood need)

Core Intent: The user is planning for a future, non-urgent medical appointment or managing their existing schedule. The tone is administrative or preparatory.

Key Indicators & Keywords:

Future-Focused: "Next week," "next month," "on the 15th," "in two weeks," "what dates are available."

Verbs: "Schedule," "book," "reschedule," "cancel," "confirm," "update," "check my appointment."

Nouns: "Appointment," "transfusion date," "next cycle," "routine check-up."

Example User Prompts:

"I would like to book my regular transfusion for the second week of September."

"Can I move my appointment from this Friday to next Monday?"

"What do I need to do to prepare for my upcoming chelation therapy session?"

"Please confirm my transfusion is scheduled for August 28th."

Key Distinction: The timeframe is not immediate. Unlike #1 (Urgent Blood Logistics), there is no sense of pressing need or crisis. It's about standard, planned healthcare.

3. General Information & Inquiry
(Previously: Frequently asked question)

Core Intent: The user is seeking knowledge or general information. The query is typically impersonal and could be answered by a knowledge base or FAQ.

Key Indicators & Keywords:

Question Words: "What is," "How does," "Why is," "Where can I," "Tell me about," "Can you explain."

Topics: Thalassemia, blood types, donation process, eligibility, diet, exercise, medical terms (chelation, ferritin), support groups, hospital locations.

Example User Prompts:

"What are the common side effects of iron chelation therapy?"

"How can I become a registered blood donor?"

"What foods are rich in folic acid and good for thalassemia patients?"

"Can you explain the difference between thalassemia major and minor?"

Key Distinction: The user is not asking for a personal action to be taken (like booking an appointment or finding blood). They are requesting data or explanation.

4. Emotional & Community Support
(Previously: Emotional support)

Core Intent: The user is expressing their feelings, seeking encouragement, or wanting to connect with others who share their experience. The focus is on the emotional or psychological aspect of their condition.

Key Indicators & Keywords:

Feeling Words: "Sad," "depressed," "anxious," "scared," "overwhelmed," "frustrated," "lonely," "hopeless."

Seeking Connection: "How do you cope," "need to talk," "does anyone else feel," "looking for motivation," "share your story."

Venting/Expressing: "I'm so tired of this," "It's so hard sometimes," "Feeling really down today."

Example User Prompts:

"I'm feeling really anxious about my dropping hemoglobin levels. It's making me so scared."

"Just feeling overwhelmed by everything today. How do you all stay positive?"

"I'm a new parent of a child with thalassemia and I feel so lost and alone."

"Needed to share a small win: my ferritin levels are down! Feeling so relieved."

Key Distinction: The primary component is emotional expression, not a request for medical or logistical help. While it might accompany another request, the model should recognize the emotional need as a distinct signal requiring a response of empathy, encouragement, or connection to community resources.

5. Immediate Medical Attention (Red Flag)
(Previously: Immediate medical attention)

Core Intent: The user is describing specific, severe, or unusual physical symptoms that require immediate evaluation by a healthcare professional. The AI's role is not to diagnose but to recognize the severity and direct the user to professional medical help urgently.

Key Indicators & Keywords (Red Flags):

Systemic/Severe: "High fever," "chills," "seizure," "uncontrollable shivering."

Cardiopulmonary: "Chest pain," "shortness of breath," "difficulty breathing," "heart palpitations," "can't catch my breath."

Neurological: "Dizzy," "fainting," "lightheaded," "severe headache," "sudden confusion," "blurry vision."

Pain: "Severe pain," "unbearable pain," "sudden abdominal pain."

Allergic Reaction: "Rash," "hives," "swelling of face/lips/tongue," "itching" (especially post-transfusion).
--- CRITICAL RULE ---
**If the user mentions needing blood BUT ALSO describes any severe symptoms (like fever, dizziness, severe pain), you MUST classify it as 5 (Immediate Medical Attention). Category 5 is the highest priority and overrides Category 1.**

--- CONTEXTUAL INFORMATION (from Knowledge Base) ---
{RAG_CONTEXT}

--- CONVERSATION HISTORY (most recent last) ---
{HISTORY}

--- CURRENT USER MESSAGE ---
{USER_MESSAGE}

Based on all the above, return ONLY the corresponding number (1, 2, 3, 4, or 5).
`;

async function classifyMessage(userMessage, history, ragContext) {
    // Format the history for the prompt
    const historyText = history.length > 0
        ? history.map(h => `${h.role}: ${h.parts}`).join("\n")
        : "No previous conversation history.";

    // Populate the prompt template
    const fullPrompt = enhancedClassifyPromptTemplate
        .replace("{RAG_CONTEXT}", ragContext)
        .replace("{HISTORY}", historyText)
        .replace("{USER_MESSAGE}", userMessage);

    try {
        // FIXED: Use the pre-initialized model object
        const result = await classificationModel.generateContent(fullPrompt);
        const response = result.response;
        const classification = response.text().trim().match(/\d/)?.[0]; // Extract the first digit found
        return classification || "6"; // Return '6' (our default/error case) if no number is found
    } catch (error) {
        console.error("Error during classification:", error);
        return "6"; // Fallback on API error
    }
}


// 🔹 Emergency donor finder (Case 1) -UNCHANGED
async function handleEmergency(city, bloodGroup, requiredUnits) {
    const bank = await BloodBank.findOne({ city });
    console.log("suceess")

    if (!bank) return "No blood bank found in your city.";

    let availableUnits = bank.inventory[bloodGroup]?.reduce((sum, entry) => sum + entry.units, 0) || 0;

    if (availableUnits < requiredUnits) {
        return `Sorry, only ${availableUnits} units of ${bloodGroup} available in ${city}. we are contacting people who might have your blood.Please contact customer care for alternatives.`;
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

// 🔹 Normal scheduling (Case 2) - UNCHANGED
async function handleNormalBloodNeed(receiverId, newDate) {
    const receiver = await Receiver.findById(receiverId).populate("user");
    if (!receiver) throw new Error("Receiver not found");

    receiver.nextDueDate = new Date(newDate);
    await receiver.save();

    console.log(`📅 Updated next transfusion for ${receiver.user.name} to ${newDate}`);
    return { message: `Next transfusion date set to ${newDate}` };
}

// ===================================================================================
// 🔹 4. ENHANCED CHATBOT MAIN FUNCTION
// This function now orchestrates the RAG process and history management.
// ===================================================================================
async function chatbot(userMessage, context = {}) {
    // Initialize history if it doesn't exist in the context
    if (!context.history) {
        context.history = [];
    }

    // 1. Retrieve relevant context from the knowledge base
    const ragContext = retrieveContext(userMessage);

    // 2. Classify the message using the enhanced prompt with RAG and history
    const classification = await classifyMessage(userMessage, context.history, ragContext);

    let response;

    switch (classification) {
        case "1":
            response = await handleEmergency(context.city, context.bloodGroup, context.requiredUnits || 1);
            break;
        case "2":
            response = await handleNormalBloodNeed(context.receiverId, context.nextDueDate);
            break;
        case "3":
            console.log("ℹ️ FAQ detected. Stub response here.");
            response = { message: "This is an FAQ response. How can I help you with information about Thalassemia or blood donation?" };
            break;
        case "4":
            console.log("💙 Emotional support detected. Stub response here.");
            response = { message: "It sounds like you're going through a tough time. Please know it's okay to feel this way. I am connecting you with a supportive community (stub)." };
            break;
        case "5":
            console.log("🚨 Immediate medical attention detected. Advising user to seek help.");
            response = { message: "Your symptoms sound serious. Please contact your doctor or go to the nearest emergency room immediately. This is not something to wait on." };
            break;
        default: // case "6" or any other unexpected value
            response = { message: "I'm having a little trouble understanding. I'm connecting you to a human agent for assistance." };
            break;
    }

    // 3. Update conversation history (mutates the context object by reference)
    context.history.push({ role: 'user', parts: userMessage });
    // Ensure response is in the correct format before pushing to history
    const responseText = typeof response === 'string' ? response : response.message;
    context.history.push({ role: 'model', parts: responseText });

    // Keep history from getting too long (e.g., last 10 exchanges)
    if (context.history.length > 20) {
        context.history = context.history.slice(-20);
    }

    return response; // Return just the response, as per the original function's contract
}
export { chatbot };