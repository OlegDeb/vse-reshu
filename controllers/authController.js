import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Response from '../models/Response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRegister = (req, res) => {
  res.render('register', { title: 'Регистрация' });
};

export const postRegister = async (req, res) => {
  const { username, firstName, lastName, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword
    });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/profile');
  } catch (error) {
    let errorMessage = 'Ошибка регистрации';
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        errorMessage = 'Пользователь с таким email уже существует';
      } else if (error.keyPattern.username) {
        errorMessage = 'Пользователь с таким логином уже существует';
      }
    } else if (error.errors?.username) {
      errorMessage = 'Логин должен содержать только латинские буквы, цифры, дефис и подчеркивание';
    }
    res.render('register', { error: errorMessage });
  }
};

export const getLogin = (req, res) => {
  const error = req.query.error ? decodeURIComponent(req.query.error) : null;
  res.render('login', { title: 'Вход', error });
};

export const postLogin = async (req, res) => {
  const { emailOrUsername, password } = req.body;
  try {
    // Ищем пользователя по email или username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Проверяем статус бана
      if (user.banStatus === 'permanent') {
        return res.render('login', { error: 'Ваш аккаунт заблокирован навсегда. Причина: ' + (user.banReason || 'Не указана') });
      }
      
      if (user.banStatus === 'temporary' && user.banUntil) {
        const now = new Date();
        if (now < user.banUntil) {
          const banUntilFormatted = user.banUntil.toLocaleString('ru-RU');
          return res.render('login', { error: `Ваш аккаунт заблокирован до ${banUntilFormatted}. Причина: ${user.banReason || 'Не указана'}` });
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
      
      req.session.userId = user._id;
      res.redirect('/profile');
    } else {
      res.render('login', { error: 'Неверный логин/email или пароль' });
    }
  } catch (error) {
    res.render('login', { error: 'Ошибка входа' });
  }
};

export const getLogout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

export const getProfile = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId);
    const userObj = user.toObject();
    userObj.createdAtFormatted = user.createdAt.toLocaleDateString('ru-RU');
    
    // Загружаем задачи пользователя
    const page = parseInt(req.query.page) || 1;
    const limit = 6; // Показываем меньше заданий на странице профиля
    const skip = (page - 1) * limit;
    
    // Получаем задачи пользователя (где он автор или исполнитель)
    const tasks = await Task.find({
      $or: [
        { author: req.session.userId },
        { acceptedResponse: { $exists: true } }
      ]
    })
    .populate('author', 'username firstName lastName')
    .populate('category', 'name icon')
    .populate({
      path: 'acceptedResponse',
      populate: {
        path: 'responder',
        select: 'username firstName lastName'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    // Фильтруем задачи, где пользователь является автором или исполнителем
    const filteredTasks = tasks.filter(task => {
      if (task.author._id.toString() === req.session.userId) {
        return true;
      }
      if (task.acceptedResponse && task.acceptedResponse.responder) {
        return task.acceptedResponse.responder._id.toString() === req.session.userId;
      }
      return false;
    });
    
    // Форматируем даты для отображения
    filteredTasks.forEach(task => {
      task.createdAtFormatted = task.createdAt.toLocaleDateString('ru-RU');
    });
    
    const totalTasks = await Task.countDocuments({
      $or: [
        { author: req.session.userId },
        { acceptedResponse: { $exists: true } }
      ]
    });
    
    // Приблизительный подсчет, так как мы фильтруем после загрузки
    const totalPages = Math.ceil(totalTasks / limit);
    const pages = [];
    for (let i = 1; i <= totalPages && i <= 5; i++) {
      pages.push(i);
    }
    
    // Собираем статистику
    // Задачи, где пользователь автор
    const tasksAsAuthor = {
      total: await Task.countDocuments({ author: req.session.userId }),
      open: await Task.countDocuments({ author: req.session.userId, status: 'open' }),
      inProgress: await Task.countDocuments({ author: req.session.userId, status: 'in_progress' }),
      closed: await Task.countDocuments({ author: req.session.userId, status: 'closed' })
    };

    // Задачи, где пользователь исполнитель (принятые отклики)
    const executorTasks = await Task.find({
      acceptedResponse: { $exists: true }
    }).populate({
      path: 'acceptedResponse',
      populate: {
        path: 'responder',
        select: '_id'
      }
    });
    const tasksAsExecutor = executorTasks.filter(task => 
      task.acceptedResponse && 
      task.acceptedResponse.responder && 
      task.acceptedResponse.responder._id.toString() === req.session.userId
    ).length;

    // Отклики пользователя
    const responses = {
      total: await Response.countDocuments({ responder: req.session.userId }),
      accepted: await Response.countDocuments({ responder: req.session.userId, status: 'accepted' }),
      pending: await Response.countDocuments({ responder: req.session.userId, status: 'pending' }),
      rejected: await Response.countDocuments({ responder: req.session.userId, status: 'rejected' })
    };

    const stats = {
      tasksAsAuthor,
      tasksAsExecutor,
      responses
    };
    
    // Определяем активную вкладку из query параметра
    const activeTab = req.query.tab || 'info';
    
    res.render('profile', {
      user: userObj,
      title: 'Профиль пользователя',
      tasks: filteredTasks,
      currentPage: page,
      totalPages,
      pages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      activeTab: activeTab,
      stats: stats
    });
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error);
    res.redirect('/');
  }
};

export const getEditProfile = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId);
    res.render('editProfile', {
      user: user.toObject(),
      title: 'Редактирование профиля',
      genders: ['мужской', 'женский']
    });
  } catch (error) {
    res.redirect('/profile');
  }
};

export const postEditProfile = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.session.userId);
    
    // Проверяем ошибку загрузки файла от multer
    if (req.uploadError) {
      return res.render('editProfile', {
        user: user.toObject(),
        title: 'Редактирование профиля',
        genders: ['мужской', 'женский'],
        error: req.uploadError
      });
    }
    
    // При использовании multer, req.body содержит текстовые поля формы
    // Проверяем, что req.body существует, иначе используем пустой объект
    if (!req.body) {
      console.error('req.body is undefined');
      return res.render('editProfile', {
        user: user.toObject(),
        title: 'Редактирование профиля',
        genders: ['мужской', 'женский'],
        error: 'Ошибка обработки формы'
      });
    }
    
    const { username, firstName, lastName, phone, dateOfBirth, gender, bio } = req.body;

    // Обновляем только разрешенные поля
    if (username && username !== user.username) {
      // Проверяем, что username не занят другим пользователем
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.render('editProfile', {
          user: user.toObject(),
          title: 'Редактирование профиля',
          genders: ['мужской', 'женский'],
          error: 'Этот логин уже занят'
        });
      }
      user.username = username;
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;

    // Обрабатываем дату рождения
    if (dateOfBirth && dateOfBirth.trim() !== '') {
      user.dateOfBirth = new Date(dateOfBirth);
    } else if (dateOfBirth === '' || !dateOfBirth) {
      user.dateOfBirth = undefined; // Удаляем дату рождения если поле пустое
    }

    if (gender && ['мужской', 'женский'].includes(gender)) {
      user.gender = gender;
    }

    // Обрабатываем информацию "О себе"
    if (bio !== undefined) {
      user.bio = bio || '';
    }

    // Обрабатываем загрузку аватара
    if (req.file) {
      // Удаляем старый аватар, если он существует
      if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, '../public', user.avatar);
        try {
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        } catch (err) {
          console.error('Ошибка удаления старого аватара:', err);
        }
      }
      // Сохраняем путь к новому аватару
      user.avatar = `/img/avatars/${req.file.filename}`;
    }

    // Обновляем дату последнего входа
    user.lastLogin = new Date();

    await user.save();

    res.redirect('/profile');
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.render('editProfile', {
      user: await User.findById(req.session.userId).then(u => u.toObject()),
      title: 'Редактирование профиля',
      genders: ['мужской', 'женский'],
      error: 'Ошибка обновления профиля'
    });
  }
};