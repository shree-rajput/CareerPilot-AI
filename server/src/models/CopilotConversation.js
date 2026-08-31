import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ["user", "assistant", "system"], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  }
}, { _id: true, timestamps: { createdAt: 'timestamp', updatedAt: false } });

const copilotConversationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  title: { 
    type: String, 
    default: "New Conversation" 
  },
  messages: [messageSchema],
  isShared: { 
    type: Boolean, 
    default: false 
  },
  shareToken: { 
    type: String, 
    sparse: true, 
    unique: true 
  }
}, { timestamps: true });

export const CopilotConversation = mongoose.model("CopilotConversation", copilotConversationSchema);
