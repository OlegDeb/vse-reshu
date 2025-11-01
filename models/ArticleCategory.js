import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';

const articleCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  slug: { 
    type: String, 
    unique: true, 
    lowercase: true 
  },
  description: {
    type: String,
    maxlength: [500, 'Описание не должно превышать 500 символов']
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware для автоматической генерации slug и обновления даты изменения
articleCategorySchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = transliterate(this.name);
  }

  // Обновляем дату изменения при любом сохранении
  this.updatedAt = new Date();

  next();
});

export default mongoose.model('ArticleCategory', articleCategorySchema);
