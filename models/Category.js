import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';

// Константы типов категорий с иконками
export const CATEGORY_TYPES = {
  'Курьерские услуги': 'fas fa-truck',
  'Ремонт и строительство': 'fas fa-tools',
  'Грузоперевозки': 'fas fa-shipping-fast',
  'Уборка и помощь по хозяйству': 'fas fa-broom',
  'Виртуальный помощник': 'fas fa-user-tie',
  'Мероприятия и промоакции': 'fas fa-bullhorn',
  'Дизайн': 'fas fa-palette',
  'Разработка ПО': 'fas fa-code',
  'Фото, видео и аудио': 'fas fa-camera',
  'Установка и ремонт техники': 'fas fa-cog',
  'Красота и здоровье': 'fas fa-spa',
  'Ремонт цифровой техники': 'fas fa-laptop',
  'Юридическая и бухгалтерская помощь': 'fas fa-balance-scale',
  'Репетиторы и обучение': 'fas fa-graduation-cap',
  'Ремонт транспорта': 'fas fa-car'
};

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, lowercase: true },
  type: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        return Object.keys(CATEGORY_TYPES).includes(value);
      },
      message: 'Выбранный тип категории не существует'
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware для автоматической генерации slug и обновления даты изменения
categorySchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = transliterate(this.name);
  }

  // Обновляем дату изменения при любом сохранении
  this.updatedAt = new Date();

  next();
});

export default mongoose.model('Category', categorySchema);