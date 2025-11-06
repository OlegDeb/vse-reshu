import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  locationType: { 
    type: String, 
    enum: ['city', 'remote'], 
    default: 'city',
    required: true 
  },
  city: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'City',
    required: function() {
      return this.locationType === 'city';
    }
  },
  status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
  moderationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  moderationComment: { type: String },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  acceptedResponse: { type: mongoose.Schema.Types.ObjectId, ref: 'Response' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Индекс для поиска
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ status: 1 });
taskSchema.index({ moderationStatus: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ locationType: 1 });
taskSchema.index({ city: 1 });

export default mongoose.model('Task', taskSchema);