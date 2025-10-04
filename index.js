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
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    // Создаем категории по умолчанию, если их нет
    const Category = (await import('./models/Category.js')).default;
    const categoriesCount = await Category.countDocuments();
    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Программирование', icon: 'fas fa-code' },
        { name: 'Дизайн', icon: 'fas fa-palette' },
        { name: 'Маркетинг', icon: 'fas fa-bullhorn' },
        { name: 'Письмо', icon: 'fas fa-pen' },
        { name: 'Перевод', icon: 'fas fa-language' },
        { name: 'Другое', icon: 'fas fa-ellipsis-h' }
      ];

      await Category.insertMany(defaultCategories);
      console.log('Добавлены категории по умолчанию');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

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
    add: (a, b) => a + b
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
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 часа
}));

// Middleware для передачи пользователя в шаблоны
app.use(async (req, res, next) => {
  if (req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      res.locals.user = user;
      res.locals.isAdmin = user.role === 'admin';
    } catch (err) {
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

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});