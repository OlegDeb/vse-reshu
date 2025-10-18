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
import User from './models/User.js';

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
  helpers: {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
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

// Middleware для передачи пользователя в шаблоны
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
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

// Маршруты
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/tasks', taskRoutes);

// Главная страница
app.get('/', (req, res) => {
  res.render('index', { title: 'Главная' });
});

// Тестовая страница для проверки работы сервера
app.get('/test', (req, res) => {
  res.json({
    status: 'Сервер работает',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'подключена' : 'не подключена'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});