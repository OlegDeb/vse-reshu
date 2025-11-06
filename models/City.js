import mongoose from 'mongoose';
import { transliterate } from '../libs/transliterate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем типы регионов из JSON файла
let REGION_TYPES = [];
try {
  const regionTypesPath = path.join(__dirname, '../libs/regionTypes.json');
  console.log('Путь к файлу:', regionTypesPath);
  console.log('Файл существует?', fs.existsSync(regionTypesPath));

  const regionTypesData = fs.readFileSync(regionTypesPath, 'utf8');
  console.log('Данные из файла:', regionTypesData.substring(0, 200) + '...');

  REGION_TYPES = JSON.parse(regionTypesData);
  console.log('REGION_TYPES загружены из JSON файла, количество:', REGION_TYPES.length);
} catch (error) {
  console.error('Ошибка загрузки REGION_TYPES из JSON файла:', error);
  // Fallback на базовые типы регионов
  REGION_TYPES = ['Республика Крым'];
  console.log('Используем fallback REGION_TYPES');
}

export { REGION_TYPES };

const citySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, lowercase: true },
  region: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        return REGION_TYPES.includes(value);
      },
      message: 'Выбранный регион не существует'
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware для автоматической генерации slug и обновления даты изменения
citySchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = transliterate(this.name);
  }

  // Обновляем дату изменения при любом сохранении
  this.updatedAt = new Date();

  next();
});

export default mongoose.model('City', citySchema);


