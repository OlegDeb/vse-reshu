import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  responder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Индекс для поиска откликов пользователя
responseSchema.index({ responder: 1 });
responseSchema.index({ task: 1 });
responseSchema.index({ status: 1 });

export default mongoose.model('Response', responseSchema);