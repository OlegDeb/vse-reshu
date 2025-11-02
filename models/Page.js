import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  metaKeywords: {
    type: String,
    trim: true,
    maxlength: 255
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Индексы для поиска
pageSchema.index({ slug: 1 });
pageSchema.index({ title: 'text' });

// Middleware для обновления updatedAt
pageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Генерация slug из title перед сохранением
pageSchema.pre('save', async function(next) {
  if (this.isModified('title') && !this.slug) {
    let generatedSlug = transliterate(this.title);
    
    // Проверяем уникальность slug
    const existingPage = await mongoose.models.Page?.findOne({ slug: generatedSlug, _id: { $ne: this._id } });
    if (existingPage) {
      let counter = 1;
      while (await mongoose.models.Page?.findOne({ slug: `${generatedSlug}-${counter}`, _id: { $ne: this._id } })) {
        counter++;
      }
      generatedSlug = `${generatedSlug}-${counter}`;
    }
    
    this.slug = generatedSlug;
  }
  next();
});

const Page = mongoose.model('Page', pageSchema);

export default Page;

