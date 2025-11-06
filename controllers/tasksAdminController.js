import Task from '../models/Task.js';
import Message from '../models/Message.js';
import Response from '../models/Response.js';
import Category from '../models/Category.js';
import City from '../models/City.js';
import User from '../models/User.js';

// Показать все задачи в админке
export const getAdminIndex = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    const moderationStatus = req.query.moderationStatus;
    const status = req.query.status;
    
    if (moderationStatus && ['pending', 'approved', 'rejected'].includes(moderationStatus)) {
      filter.moderationStatus = moderationStatus;
    }
    
    if (status && ['open', 'in_progress', 'closed'].includes(status)) {
      filter.status = status;
    }

    const tasks = await Task.find(filter)
      .populate('author', 'firstName lastName username avatar')
      .populate('category', 'name icon slug')
      .populate('city', 'name region')
      .populate('moderatedBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Task.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Генерируем массив страниц для пагинации
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    res.render('admin/tasks/index', {
      title: 'Модерация задач',
      tasks,
      currentPage: page,
      totalPages,
      pages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      currentModerationStatus: moderationStatus,
      currentStatus: status,
      currentPath: '/admin/tasks'
    });
  } catch (error) {
    console.error('Ошибка загрузки задач в админке:', error);
    res.status(500).send('Ошибка загрузки задач');
  }
};

// Просмотр задачи для модерации с перепиской
export const getAdminShow = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('author', 'firstName lastName username avatar')
      .populate('category', 'name icon slug')
      .populate('city', 'name region')
      .populate('moderatedBy', 'firstName lastName username')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: 'firstName lastName username avatar'
        }
      });

    if (!task) {
      return res.render('error', { message: 'Задача не найдена' });
    }

    // Получаем все отклики на задачу
    const responses = await Response.find({ task: req.params.id })
      .populate('responder', 'firstName lastName username avatar')
      .sort({ createdAt: -1 });

    // Получаем все сообщения между автором и исполнителем
    let messages = [];
    let executor = null;
    
    if (task.acceptedResponse && task.acceptedResponse.responder) {
      executor = task.acceptedResponse.responder;
      
      // Получаем все сообщения для этой задачи
      messages = await Message.find({ task: req.params.id })
        .populate('sender', 'firstName lastName username avatar')
        .sort({ createdAt: 1 });
    }

    // Форматируем даты
    task.createdAtFormatted = task.createdAt.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (task.moderatedAt) {
      task.moderatedAtFormatted = task.moderatedAt.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    responses.forEach(response => {
      response.createdAtFormatted = response.createdAt.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    messages.forEach(message => {
      message.createdAtFormatted = message.createdAt.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Проверяем наличие ошибки в query параметрах
    const errorMessage = req.query.error ? decodeURIComponent(req.query.error) : null;

    res.render('admin/tasks/show', {
      title: `Модерация задачи: ${task.title}`,
      task,
      responses,
      messages,
      executor,
      currentUserId: req.session.userId || null,
      currentPath: `/admin/tasks/${task._id}`,
      error: errorMessage
    });
  } catch (error) {
    console.error('Ошибка загрузки задачи для модерации:', error);
    res.render('error', { message: 'Ошибка загрузки задачи: ' + error.message });
  }
};

// Одобрить задачу
export const postApproveTask = async (req, res) => {
  try {
    if (!req.session.userId) {
      console.error('Ошибка: пользователь не авторизован');
      return res.redirect('/admin/tasks/' + req.params.id + '?error=unauthorized');
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      console.error('Ошибка: задача не найдена, ID:', req.params.id);
      return res.redirect('/admin/tasks?error=notfound');
    }

    console.log('Одобрение задачи:', {
      taskId: task._id,
      currentStatus: task.moderationStatus,
      userId: req.session.userId
    });

    task.moderationStatus = 'approved';
    task.moderatedBy = req.session.userId;
    task.moderatedAt = new Date();
    // При одобрении очищаем комментарий модерации, если он был
    if (req.body.comment && req.body.comment.trim() !== '') {
      task.moderationComment = req.body.comment.trim();
    } else {
      task.moderationComment = null;
    }
    
    await task.save();
    
    console.log('Задача успешно одобрена:', task._id);

    // Если запрос AJAX, возвращаем JSON, иначе редирект
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, message: 'Задача одобрена' });
    }
    
    res.redirect('/admin/tasks');
  } catch (error) {
    console.error('Ошибка одобрения задачи:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Стек ошибки:', error.stack);
    console.error('req.params:', req.params);
    console.error('req.body:', req.body);
    console.error('req.session.userId:', req.session.userId);
    
    // Если запрос AJAX, возвращаем JSON, иначе рендерим страницу с ошибкой
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ success: false, error: 'Ошибка одобрения задачи: ' + error.message });
    }
    
    // Иначе редиректим с параметром ошибки
    res.redirect('/admin/tasks/' + req.params.id + '?error=' + encodeURIComponent(error.message));
  }
};

// Отклонить задачу
export const postRejectTask = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    const { comment } = req.body;
    
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Необходимо указать причину отклонения' });
    }

    task.moderationStatus = 'rejected';
    task.moderatedBy = req.session.userId;
    task.moderatedAt = new Date();
    task.moderationComment = comment.trim();
    
    await task.save();

    // Если запрос AJAX, возвращаем JSON, иначе редирект
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, message: 'Задача отклонена' });
    }
    
    res.redirect('/admin/tasks');
  } catch (error) {
    console.error('Ошибка отклонения задачи:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Стек ошибки:', error.stack);
    
    // Если запрос AJAX, возвращаем JSON, иначе редиректим
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ success: false, error: 'Ошибка отклонения задачи: ' + error.message });
    }
    
    req.flash ? req.flash('error', 'Ошибка отклонения задачи: ' + error.message) : null;
    res.redirect('/admin/tasks/' + req.params.id);
  }
};

// Вернуть задачу на модерацию
export const postPendingTask = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }

    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    task.moderationStatus = 'pending';
    task.moderatedBy = req.session.userId;
    task.moderatedAt = new Date();
    task.moderationComment = null;
    
    await task.save();

    // Если запрос AJAX, возвращаем JSON, иначе редирект
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true, message: 'Задача возвращена на модерацию' });
    }
    
    res.redirect('/admin/tasks');
  } catch (error) {
    console.error('Ошибка возврата задачи на модерацию:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Стек ошибки:', error.stack);
    
    // Если запрос AJAX, возвращаем JSON, иначе редиректим
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ success: false, error: 'Ошибка возврата задачи на модерацию: ' + error.message });
    }
    
    req.flash ? req.flash('error', 'Ошибка возврата задачи на модерацию: ' + error.message) : null;
    res.redirect('/admin/tasks/' + req.params.id);
  }
};

