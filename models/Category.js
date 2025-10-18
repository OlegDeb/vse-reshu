import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем типы категорий из JSON файла
let CATEGORY_TYPES = {};
try {
  const categoryTypesPath = path.join(__dirname, '../libs/categoryTypes.json');
  console.log('Путь к файлу:', categoryTypesPath);
  console.log('Файл существует?', fs.existsSync(categoryTypesPath));

  const categoryTypesData = fs.readFileSync(categoryTypesPath, 'utf8');
  console.log('Данные из файла:', categoryTypesData.substring(0, 200) + '...');

  CATEGORY_TYPES = JSON.parse(categoryTypesData);
  console.log('CATEGORY_TYPES загружены из JSON файла, количество:', Object.keys(CATEGORY_TYPES).length);
} catch (error) {
  console.error('Ошибка загрузки CATEGORY_TYPES из JSON файла:', error);
  // Fallback на базовые типы категорий
  CATEGORY_TYPES = {
    'Курьерские услуги': 'fas fa-truck',
    'Ремонт и строительство': 'fas fa-tools',
    'Грузоперевозки': 'fas fa-shipping-fast'
  };
  console.log('Используем fallback CATEGORY_TYPES');
}

export { CATEGORY_TYPES };

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