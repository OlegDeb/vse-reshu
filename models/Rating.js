import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  task: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  },
  rater: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rated: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    maxlength: 1000,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Индексы для быстрого поиска
ratingSchema.index({ task: 1, rater: 1 }, { unique: true }); // Один пользователь может оценить другого только один раз за задачу
ratingSchema.index({ rated: 1 }); // Для поиска всех рейтингов пользователя
ratingSchema.index({ rater: 1 }); // Для поиска всех рейтингов, оставленных пользователем

export default mongoose.model('Rating', ratingSchema);

