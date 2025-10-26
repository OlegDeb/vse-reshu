import Task from '../models/Task.js';
import Message from '../models/Message.js';

// Middleware для проверки аутентификации
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Получить сообщения для задачи
export const getMessages = async (req, res) => {
  try {
    // console.log('Loading messages for task ID:', req.params.taskId); // Убрано для продакшена

    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    // Проверяем, что задача существует и пользователь является участником
    const task = await Task.findById(req.params.taskId)
      .populate('author', 'username firstName lastName')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: 'username firstName lastName'
        }
      });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    // Проверяем, что пользователь является автором или исполнителем задачи
    const isAuthor = task.author._id.toString() === req.session.userId;
    const isExecutor = task.acceptedResponse && task.acceptedResponse.responder &&
                      task.acceptedResponse.responder._id.toString() === req.session.userId;

    if (!isAuthor && !isExecutor) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    // Загружаем сообщения для задачи
    const messages = await Message.find({ task: req.params.taskId })
      .populate('sender', 'username firstName lastName')
      .sort({ createdAt: 1 });

    // Добавляем системные сообщения в ответ
    const messagesWithSystem = messages.map(message => ({
      ...message.toObject(),
      isSystemMessage: message.isSystemMessage || false
    }));

    // Помечаем сообщения как прочитанные
    await Message.updateMany(
      { task: req.params.taskId, sender: { $ne: req.session.userId }, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      messages: messagesWithSystem,
      task: {
        title: task.title,
        status: task.status,
        isAuthor: isAuthor,
        isExecutor: isExecutor
      }
    });

  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки сообщений' });
  }
};

// Отправить сообщение
export const postMessage = async (req, res) => {
  try {
    // console.log('Sending message for task ID:', req.params.taskId); // Убрано для продакшена

    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Сообщение не может быть пустым' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Сообщение слишком длинное (максимум 1000 символов)' });
    }

    // Проверяем, что задача существует и пользователь является участником
    const task = await Task.findById(req.params.taskId)
      .populate('author', 'username firstName lastName')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: 'username firstName lastName'
        }
      });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    // Проверяем, что пользователь является автором или исполнителем задачи
    const isAuthor = task.author._id.toString() === req.session.userId;
    const isExecutor = task.acceptedResponse && task.acceptedResponse.responder &&
                      task.acceptedResponse.responder._id.toString() === req.session.userId;

    if (!isAuthor && !isExecutor) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }

    // Проверяем, что задача в работе или закрыта (сообщения можно отправлять и после закрытия)
    if (task.status !== 'in_progress' && task.status !== 'closed') {
      return res.status(400).json({ success: false, error: 'Сообщения можно отправлять только для задач в работе или закрытых' });
    }

    // Создаем новое сообщение
    const newMessage = new Message({
      task: req.params.taskId,
      sender: req.session.userId,
      message: message.trim(),
      isSystemMessage: false
    });

    await newMessage.save();

    // Загружаем отправителя для ответа
    await newMessage.populate('sender', 'username firstName lastName');

    // console.log('Message sent successfully'); // Убрано для продакшена
    res.json({
      success: true,
      message: {
        ...newMessage.toObject(),
        isSystemMessage: false
      }
    });

  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ success: false, error: 'Ошибка отправки сообщения' });
  }
};