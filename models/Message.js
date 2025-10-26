import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  message: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false },
  isSystemMessage: { type: Boolean, default: false }
}, { timestamps: { createdAt: false, updatedAt: true } });

// Индексы для быстрого поиска сообщений задачи
messageSchema.index({ task: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ task: 1, isRead: 1 });
messageSchema.index({ task: 1, isSystemMessage: 1 });

export default mongoose.model('Message', messageSchema);