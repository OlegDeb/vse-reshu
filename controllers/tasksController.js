import Task from '../models/Task.js';
import Response from '../models/Response.js';
import Message from '../models/Message.js';
import Category, { CATEGORY_TYPES } from '../models/Category.js';

// Middleware для проверки аутентификации
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Вспомогательная функция для получения задач с категорией
const getTasksWithCategory = async (categorySlug, page = 1) => {
  const limit = 10;
  const skip = (page - 1) * limit;
  
  // Формируем запрос с фильтром по категории
  const query = { status: 'open' };
  let categoryFilter = null;
  if (categorySlug) {
    categoryFilter = await Category.findOne({ slug: categorySlug });
    if (categoryFilter) {
      query.category = categoryFilter._id;
    } else {
      // Если категория не найдена, возвращаем null
      return null;
    }
  }

  const tasks = await Task.find(query)
    .populate('author', 'firstName lastName username avatar')
    .populate('category', 'name icon slug type')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalTasks = await Task.countDocuments(query);
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

  // Получаем все категории, сгруппированные по типам
  const allCategories = await Category.find().sort({ type: 1, name: 1 });
  const categoriesByType = {};
  allCategories.forEach(category => {
    if (!categoriesByType[category.type]) {
      categoriesByType[category.type] = [];
    }
    categoriesByType[category.type].push(category);
  });

  return {
    tasks,
    currentPage: page,
    totalPages,
    pages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    categoriesByType,
    categoryFilter
  };
};

// Получить список задач (для обратной совместимости с query параметром)
export const getTasks = async (req, res) => {
  try {
    console.log('getTasks called');
    const page = parseInt(req.query.page) || 1;
    const categorySlug = req.query.category;

    const result = await getTasksWithCategory(categorySlug, page);
    
    if (!result) {
      return res.render('error', { message: 'Категория не найдена' });
    }

    res.render('tasks/index', {
      tasks: result.tasks,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      pages: result.pages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
      title: 'Задания',
      categoriesByType: result.categoriesByType,
      categoryTypes: CATEGORY_TYPES,
      currentCategory: result.categoryFilter
    });

  } catch (error) {
    console.error('Error loading tasks:', error);
    res.render('error', { message: 'Ошибка загрузки задач' });
  }
};

// Получить список задач по категории (ЧПУ)
export const getTasksByCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const categorySlug = req.params.slug;

    const result = await getTasksWithCategory(categorySlug, page);
    
    if (!result) {
      return res.render('error', { message: 'Категория не найдена' });
    }

    res.render('tasks/index', {
      tasks: result.tasks,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      pages: result.pages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
      title: result.categoryFilter ? result.categoryFilter.name : 'Задания',
      categoriesByType: result.categoriesByType,
      categoryTypes: CATEGORY_TYPES,
      currentCategory: result.categoryFilter
    });
  } catch (error) {
    console.error('Error loading tasks by category:', error);
    res.render('error', { message: 'Ошибка загрузки задач' });
  }
};

// Форма создания задачи
export const getCreateTask = async (req, res) => {
  try {
    const categories = await Category.find();
    // Создаем массив типов категорий для удобства работы в шаблоне
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    res.render('tasks/create', {
      categories,
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray,
      title: 'Создать задачу'
    });
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
    console.log('Loading task with ID:', req.params.id);

    const task = await Task.findById(req.params.id)
      .populate('author', 'firstName lastName username')
      .populate('category', 'name icon')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: 'firstName lastName username'
        }
      });

    if (!task) {
      console.log('Task not found with ID:', req.params.id);
      return res.render('error', { message: 'Задача не найдена' });
    }

    console.log('Task found:', task.title);

    const responses = await Response.find({ task: req.params.id })
      .populate('responder', 'firstName lastName username')
      .sort({ createdAt: -1 });

    console.log('Responses found:', responses.length);

    // Форматируем даты
    task.createdAtFormatted = task.createdAt.toLocaleDateString('ru-RU');
    responses.forEach(response => {
      response.createdAtFormatted = response.createdAt.toLocaleDateString('ru-RU');
      response.isOwnResponse = response.responder._id.toString() === req.session.userId;
    });

    const isAuthor = req.session.userId ? task.author._id.toString() === req.session.userId : false;
    const hasResponded = req.session.userId ? responses.some(r => r.responder._id.toString() === req.session.userId) : false;

    res.render('tasks/show', {
      task,
      responses,
      isAuthor,
      hasResponded,
      currentUserId: req.session.userId || null,
      title: task.title
    });
  } catch (error) {
    console.error('Error loading task:', error);
    res.render('error', { message: 'Ошибка загрузки задачи: ' + error.message });
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

    // Создаем системное сообщение о закрытии задачи
    const systemMessage = new Message({
      task: req.params.id,
      message: `📋 Задача "${task.title}" была закрыта заказчиком.`,
      isSystemMessage: true,
      isRead: true
    });
    await systemMessage.save();

    res.redirect(`/tasks/${req.params.id}`);
  } catch (error) {
    res.redirect(`/tasks/${req.params.id}`);
  }
};

// Форма редактирования задачи
export const getEditTask = async (req, res) => {
  try {
    console.log('Loading edit form for task ID:', req.params.id);
    console.log('User ID:', req.session.userId);

    if (!req.session.userId) {
      console.log('User not authenticated');
      return res.redirect('/login');
    }

    const task = await Task.findById(req.params.id).populate('category', 'name');

    if (!task) {
      console.log('Task not found with ID:', req.params.id);
      return res.render('error', { message: 'Задача не найдена' });
    }

    console.log('Task found:', task.title);
    console.log('Task author:', task.author.toString());
    console.log('Current user:', req.session.userId);

    // Проверяем, что пользователь является автором задачи
    if (task.author.toString() !== req.session.userId) {
      console.log('User is not the author of the task');
      return res.render('error', { message: 'У вас нет прав для редактирования этой задачи' });
    }

    console.log('User is the author, task status:', task.status);

    // Проверяем, что задача не закрыта
    if (task.status === 'closed') {
      console.log('Task is closed, cannot edit');
      return res.render('error', { message: 'Нельзя редактировать закрытую задачу' });
    }

    console.log('Loading categories...');
    const categories = await Category.find();
    console.log('Categories loaded:', categories.length);

    // Создаем массив типов категорий для удобства работы в шаблоне
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    console.log('Rendering edit form for task:', task.title);
    res.render('tasks/edit', {
      task: task.toObject(),
      categories,
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray,
      title: 'Редактирование задачи'
    });
  } catch (error) {
    console.error('Ошибка загрузки формы редактирования задачи:', error);
    res.render('error', { message: 'Ошибка загрузки формы редактирования: ' + error.message });
  }
};

// Редактирование задачи
export const postEditTask = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const { title, description, category } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.render('error', { message: 'Задача не найдена' });
    }

    // Проверяем, что пользователь является автором задачи
    if (task.author.toString() !== req.session.userId) {
      return res.render('error', { message: 'У вас нет прав для редактирования этой задачи' });
    }

    // Проверяем, что задача не закрыта
    if (task.status === 'closed') {
      return res.render('error', { message: 'Нельзя редактировать закрытую задачу' });
    }

    // Обновляем задачу
    task.title = title;
    task.description = description;
    task.category = category;

    await task.save();

    res.redirect(`/tasks/${task._id}`);
  } catch (error) {
    console.error('Ошибка редактирования задачи:', error);

    // Загружаем задачу и категории заново для формы с ошибкой
    const task = await Task.findById(req.params.id).populate('category', 'name');
    const categories = await Category.find();

    // Создаем массив типов категорий для удобства работы в шаблоне
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    res.render('tasks/edit', {
      task: task.toObject(),
      categories,
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray,
      error: 'Ошибка сохранения задачи: ' + error.message,
      title: 'Редактирование задачи'
    });
  }
};

// Получить задачи пользователя (мои задачи)
export const getMyTasks = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Получаем задачи пользователя (где он автор или исполнитель)
    const tasks = await Task.find({
      $or: [
        { author: req.session.userId }, // задачи, созданные пользователем
        { acceptedResponse: { $exists: true } } // задачи с принятыми откликами
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

    // Фильтруем задачи, где пользователь является исполнителем
    const filteredTasks = tasks.filter(task => {
      if (task.author._id.toString() === req.session.userId) {
        return true; // пользователь - автор задачи
      }
      if (task.acceptedResponse && task.acceptedResponse.responder) {
        return task.acceptedResponse.responder._id.toString() === req.session.userId;
      }
      return false;
    });

    const totalTasks = filteredTasks.length;
    const totalPages = Math.ceil(totalTasks / limit);

    // Создаем массив страниц для пагинации
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    res.render('tasks/myTasks', {
      tasks: filteredTasks,
      currentPage: page,
      totalPages,
      pages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      title: 'Мои задачи'
    });
  } catch (error) {
    console.error('Ошибка загрузки задач пользователя:', error);
    res.render('error', { message: 'Ошибка загрузки задач: ' + error.message });
  }
};