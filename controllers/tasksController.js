import Task from '../models/Task.js';
import Response from '../models/Response.js';
import Category from '../models/Category.js';

// Middleware для проверки аутентификации
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Получить список задач
export const getTasks = async (req, res) => {
  try {
    console.log('getTasks called');
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const tasks = await Task.find({ status: 'open' })
      .populate('author', 'name')
      .populate('category', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTasks = await Task.countDocuments({ status: 'open' });
    const totalPages = Math.ceil(totalTasks / limit);

    // Форматируем даты для отображения
    tasks.forEach(task => {
      task.createdAtFormatted = task.createdAt.toLocaleDateString('ru-RU');
    });

    // Создаем массив страниц для пагинации
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    res.render('tasks/index', {
      tasks,
      currentPage: page,
      totalPages,
      pages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      title: 'Задачи'
    });
  } catch (error) {
    res.render('error', { message: 'Ошибка загрузки задач' });
  }
};

// Форма создания задачи
export const getCreateTask = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('tasks/create', { categories, title: 'Создать задачу' });
  } catch (error) {
    res.render('error', { message: 'Ошибка загрузки категорий' });
  }
};

// Создание задачи
export const postCreateTask = async (req, res) => {
  const { title, description, category } = req.body;
  try {
    const task = new Task({
      title,
      description,
      category,
      author: req.session.userId
    });
    await task.save();
    res.redirect('/tasks');
  } catch (error) {
    const categories = await Category.find();
    res.render('tasks/create', {
      categories,
      error: 'Ошибка создания задачи',
      title: 'Создать задачу'
    });
  }
};

// Просмотр задачи
export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('author', 'name')
      .populate('category', 'name icon')
      .populate('acceptedResponse');

    if (!task) {
      return res.render('error', { message: 'Задача не найдена' });
    }

    const responses = await Response.find({ task: req.params.id })
      .populate('responder', 'name')
      .sort({ createdAt: -1 });

    // Форматируем даты
    task.createdAtFormatted = task.createdAt.toLocaleDateString('ru-RU');
    responses.forEach(response => {
      response.createdAtFormatted = response.createdAt.toLocaleDateString('ru-RU');
      response.isOwnResponse = response.responder._id.toString() === req.session.userId;
    });

    const isAuthor = task.author._id.toString() === req.session.userId;
    const hasResponded = responses.some(r => r.responder._id.toString() === req.session.userId);

    res.render('tasks/show', {
      task,
      responses,
      isAuthor,
      hasResponded,
      currentUserId: req.session.userId,
      title: task.title
    });
  } catch (error) {
    res.render('error', { message: 'Ошибка загрузки задачи' });
  }
};

// Оставить отклик
export const postResponse = async (req, res) => {
  const { message } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.status !== 'open' || task.author.toString() === req.session.userId) {
      return res.redirect(`/tasks/${req.params.id}`);
    }

    const existingResponse = await Response.findOne({
      task: req.params.id,
      responder: req.session.userId
    });

    if (existingResponse) {
      return res.redirect(`/tasks/${req.params.id}`);
    }

    const response = new Response({
      task: req.params.id,
      responder: req.session.userId,
      message
    });
    await response.save();

    res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.id}`);
  }
};

// Редактировать отклик
export const editResponse = async (req, res) => {
  const { message } = req.body;
  try {
    const response = await Response.findById(req.params.responseId);
    if (!response || response.responder.toString() !== req.session.userId) {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    const task = await Task.findById(req.params.taskId);
    if (!task || task.status !== 'open') {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    // Обновить отклик
    response.message = message;
    await response.save();

    res.redirect(`/tasks/${req.params.taskId}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.taskId}`);
  }
};

// Удалить отклик
export const deleteResponse = async (req, res) => {
  try {
    const response = await Response.findById(req.params.responseId);
    if (!response || response.responder.toString() !== req.session.userId) {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    const task = await Task.findById(req.params.taskId);
    if (!task || task.status !== 'open') {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    // Удалить отклик
    await Response.findByIdAndDelete(req.params.responseId);

    res.redirect(`/tasks/${req.params.taskId}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.taskId}`);
  }
};

// Принять отклик
export const acceptResponse = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task || task.author.toString() !== req.session.userId || task.status !== 'open') {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    const response = await Response.findById(req.params.responseId);
    if (!response || response.task.toString() !== req.params.taskId) {
      return res.redirect(`/tasks/${req.params.taskId}`);
    }

    // Обновить статус отклика
    response.status = 'accepted';
    await response.save();

    // Обновить задачу
    task.status = 'in_progress';
    task.acceptedResponse = response._id;
    await task.save();

    // Отклонить остальные отклики
    await Response.updateMany(
      { task: req.params.taskId, _id: { $ne: req.params.responseId } },
      { status: 'rejected' }
    );

    res.redirect(`/tasks/${req.params.taskId}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.taskId}`);
  }
};

// Закрыть задачу
export const closeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.author.toString() !== req.session.userId || task.status !== 'in_progress') {
      return res.redirect(`/tasks/${req.params.id}`);
    }

    task.status = 'closed';
    await task.save();

    res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.id}`);
  }
};