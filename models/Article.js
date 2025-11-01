import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';
import ArticleCategory from './ArticleCategory.js';

const articleSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Название статьи обязательно'],
    trim: true,
    maxlength: [200, 'Название не должно превышать 200 символов']
  },
  slug: { 
    type: String, 
    unique: true, 
    lowercase: true,
    index: true
  },
  content: { 
    type: String, 
    required: [true, 'Содержимое статьи обязательно']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Краткое описание не должно превышать 500 символов']
  },
  image: {
    type: String, // Путь к изображению
    default: null
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArticleCategory',
    required: [true, 'Категория статьи обязательна']
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'published'],
      message: 'Статус должен быть draft или published'
    },
    default: 'draft'
  },
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title не должен превышать 60 символов']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description не должно превышать 160 символов']
  },
  metaKeywords: {
    type: String,
    maxlength: [255, 'Meta keywords не должны превышать 255 символов']
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  publishedAt: {
    type: Date,
    default: null
  }
});

// Индексы для поиска и оптимизации
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ slug: 1 }, { unique: true });

// Middleware для автоматической генерации slug и обновления дат
articleSchema.pre('save', async function(next) {
  // Генерация slug из заголовка с уникальностью
  if (this.isModified('title') || this.isNew) {
    const baseSlug = transliterate(this.title);
    let slug = baseSlug;
    let counter = 1;

    // Проверяем уникальность slug
    const Article = this.constructor;
    while (await Article.findOne({ slug: slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }

  // Обновляем дату изменения при любом сохранении
  this.updatedAt = new Date();

  // Устанавливаем дату публикации при первой публикации
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Генерация meta title если не указан
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title.length > 60 ? this.title.substring(0, 57) + '...' : this.title;
  }

  // Генерация excerpt из content если не указан
  if (!this.excerpt && this.content) {
    // Удаляем HTML теги и берем первые 200 символов
    const cleanContent = this.content.replace(/<[^>]*>/g, '').trim();
    this.excerpt = cleanContent.length > 200 ? cleanContent.substring(0, 197) + '...' : cleanContent;
  }

  next();
});

// Виртуальные поля
articleSchema.virtual('isPublished').get(function() {
  return this.status === 'published';
});

articleSchema.virtual('isDraft').get(function() {
  return this.status === 'draft';
});

articleSchema.virtual('url').get(function() {
  return `/articles/${this.slug}`;
});

// Static методы
articleSchema.statics.findPublished = function() {
  return this.find({ status: 'published' }).sort({ publishedAt: -1 });
};

articleSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug, status: 'published' });
};

articleSchema.statics.findDrafts = function() {
  return this.find({ status: 'draft' }).sort({ updatedAt: -1 });
};

// Методы экземпляра
articleSchema.methods.publish = function() {
  this.status = 'published';
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
  return this.save();
};

articleSchema.methods.unpublish = function() {
  this.status = 'draft';
  return this.save();
};

articleSchema.methods.incrementViews = function() {
  this.viewsCount += 1;
  return this.save();
};

// Обеспечиваем возврат виртуальных полей при сериализации в JSON
articleSchema.set('toJSON', { virtuals: true });
articleSchema.set('toObject', { virtuals: true });

export default mongoose.model('Article', articleSchema);