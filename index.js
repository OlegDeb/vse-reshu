import dotenv from 'dotenv';

dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import { engine } from 'express-handlebars';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import taskRoutes from './routes/tasks.js';
import messageRoutes from './routes/messages.js';
import publicProfileRoutes from './routes/publicProfile.js';
import articlesRoutes from './routes/articles.js';
import pagesRoutes from './routes/pages.js';
import User from './models/User.js';
import Category, { CATEGORY_TYPES } from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Подключение к MongoDB
// Локальное подключение к MongoDB (если MONGO_URI не настроен)
const localMongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vse-reshu';

console.log('🔄 Подключение к MongoDB...');
console.log('📝 MONGO_URI:', localMongoURI);

mongoose.connect(localMongoURI, {
  serverSelectionTimeoutMS: 10000, // Увеличен таймаут до 10 секунд
  socketTimeoutMS: 45000,
  bufferCommands: false,
  maxPoolSize: 5,
  minPoolSize: 1
})
  .then(() => {
    console.log('✅ MongoDB подключена успешно');
    console.log('📊 База данных:', mongoose.connection.name || 'vse-reshu');
    console.log('🔗 Строка подключения:', localMongoURI);
    console.log('🚀 Сервер готов к работе');
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к MongoDB:', err.message);
    console.error('❌ Полная ошибка:', err);

    if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 Возможные решения:');
      console.log('1. Убедитесь, что MongoDB запущена локально');
      console.log('2. Для локальной разработки используйте: mongodb://127.0.0.1:27017/vse-reshu');
      console.log('3. Проверьте, что процесс mongod запущен: ps aux | grep mongod');
    } else if (err.message.includes('authentication failed')) {
      console.log('🔐 Проверьте логин и пароль в MONGO_URI');
    } else if (err.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('🌐 Проверьте доступность сервера MongoDB');
    }

    console.log('\n📝 Используется строка подключения:', localMongoURI);
    console.log('⚠️  Сервер запущен, но без подключения к БД');
  });

// Настройка Handlebars
app.engine('hbs', engine({
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  defaultLayout: 'main',
  extname: 'hbs',
  partialsDir: [
    path.join(__dirname, 'views', 'partials'),
    path.join(__dirname, 'views', 'admin', 'partials')
  ],
  helpers: {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    neq: (a, b) => a !== b,
    lt: (a, b) => a < b,
    gt: (a, b) => a > b,
    lte: (a, b) => a <= b,
    gte: (a, b) => a >= b,
    and: (a, b) => a && b,
    or: (a, b) => a || b,
    subtract: (a, b) => a - b,
    add: (a, b) => a + b,
    formatDate: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    inputDate: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0]; // Формат YYYY-MM-DD для input[type="date"]
    },
    calculateAge: (birthDate) => {
      if (!birthDate) return '';
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }

      if (age <= 0) return '';

      // Правильное склонение слова "год/года/лет"
      if (age % 10 === 1 && age % 100 !== 11) {
        return `${age} год`;
      } else if (age % 10 >= 2 && age % 10 <= 4 && (age % 100 < 10 || age % 100 >= 20)) {
        return `${age} года`;
      } else {
        return `${age} лет`;
      }
    },
    split: (str, delimiter) => {
      if (!str) return [];
      return str.split(delimiter);
    },
    range: (start, end) => {
      const result = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    },
    entries: (obj) => {
      if (!obj) return [];
      return Object.entries(obj).map(([key, value]) => ({ key, value }));
    },
    toString: (val) => {
      if (val && val.toString) return val.toString();
      return String(val || '');
    },
    contains: (str, substring) => {
      if (!str || !substring) return false;
      return String(str).includes(String(substring));
    }
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Сессии
app.use(session({
  secret: process.env.SECRET_KEY || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: localMongoURI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 часа
}));

// Middleware для установки текущего пути
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Middleware для передачи пользователя в шаблоны и проверки бана
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      
      // Проверяем бан (кроме страниц выхода и админки)
      if (user && req.path !== '/logout' && !req.path.startsWith('/admin')) {
        if (user.banStatus === 'permanent') {
          req.session.destroy();
          return res.redirect('/login?error=' + encodeURIComponent('Ваш аккаунт заблокирован навсегда. Причина: ' + (user.banReason || 'Не указана')));
        }
        
        if (user.banStatus === 'temporary' && user.banUntil) {
          const now = new Date();
          if (now < user.banUntil) {
            const banUntilFormatted = user.banUntil.toLocaleString('ru-RU');
            req.session.destroy();
            return res.redirect('/login?error=' + encodeURIComponent(`Ваш аккаунт заблокирован до ${banUntilFormatted}. Причина: ${user.banReason || 'Не указана'}`));
          } else {
            // Временный бан истек, снимаем бан
            user.banStatus = 'none';
            user.banUntil = null;
            user.banReason = null;
            user.bannedBy = null;
            user.bannedAt = null;
            await user.save();
          }
        }
      }
      
      res.locals.user = user;
      res.locals.isAdmin = user && user.role === 'admin';
    } catch (err) {
      console.log('Ошибка загрузки пользователя:', err);
      res.locals.user = null;
      res.locals.isAdmin = false;
    }
  } else {
    res.locals.user = null;
    res.locals.isAdmin = false;
  }
  next();
});

// AJAX endpoint для загрузки категорий по типу - должен быть раньше других роутов
app.get('/categories-by-type', async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await Category.find({ type });

    res.json({
      success: true,
      categories: categories,
      type: type
    });
  } catch (error) {
    console.error('Ошибка загрузки категорий по типу:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки категорий'
    });
  }
});

// Тестовая страница для проверки работы сервера
app.get('/test', (req, res) => {
  res.json({
    status: 'Сервер работает',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'подключена' : 'не подключена'
  });
});

// Главная страница - должна быть зарегистрирована раньше всех роутов
app.get('/', async (req, res) => {
  try {
    // Создаем массив типов категорий для удобства работы в шаблоне
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    // Получаем все категории для отображения
    const allCategories = await Category.find({});

    // Группируем категории по типам
    const categoriesByType = {};
    allCategories.forEach(category => {
      if (!categoriesByType[category.type]) {
        categoriesByType[category.type] = [];
      }
      categoriesByType[category.type].push(category);
    });

    // Определяем доступный тип для отображения
    let selectedType = req.query.type;
    if (!selectedType) {
      // Если нет категорий для "Курьерские услуги", берем первый доступный тип
      if (categoriesByType['Курьерские услуги'] && categoriesByType['Курьерские услуги'].length > 0) {
        selectedType = 'Курьерские услуги';
      } else if (Object.keys(categoriesByType).length > 0) {
        selectedType = Object.keys(categoriesByType)[0];
      } else {
        selectedType = 'Курьерские услуги'; // fallback
      }
    }

    res.render('index', {
      title: 'Главная',
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray,
      categoriesByType: categoriesByType,
      selectedType: selectedType
    });
  } catch (error) {
    console.error('Ошибка загрузки главной страницы:', error);
    res.render('index', {
      title: 'Главная',
      error: 'Ошибка загрузки данных'
    });
  }
});

// Маршруты
app.use('/', authRoutes);
app.use('/', publicProfileRoutes);
app.use('/', messageRoutes);
app.use('/', articlesRoutes);
app.use('/', pagesRoutes);
app.use('/admin', adminRoutes);
app.use('/tasks', taskRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});