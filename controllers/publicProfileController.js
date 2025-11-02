import User from '../models/User.js';
import Task from '../models/Task.js';
import Response from '../models/Response.js';

// Контроллер для публичного профиля пользователя
export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Ищем пользователя по username
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(404).render('error', {
        title: 'Пользователь не найден',
        error: 'Пользователь не найден',
        message: `Пользователь с логином "${username}" не существует.`
      });
    }

    // Определяем публичные поля пользователя (без контактных данных)
    const publicUserData = {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      bio: user.bio,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      createdAt: user.createdAt,
      createdAtFormatted: user.createdAt.toLocaleDateString('ru-RU')
    };

    // Собираем статистику
    // Задачи, где пользователь автор
    const tasksAsAuthor = {
      total: await Task.countDocuments({ author: user._id }),
      open: await Task.countDocuments({ author: user._id, status: 'open' }),
      inProgress: await Task.countDocuments({ author: user._id, status: 'in_progress' }),
      closed: await Task.countDocuments({ author: user._id, status: 'closed' })
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
      task.acceptedResponse.responder._id.toString() === user._id.toString()
    ).length;

    // Отклики пользователя
    const responses = {
      total: await Response.countDocuments({ responder: user._id }),
      accepted: await Response.countDocuments({ responder: user._id, status: 'accepted' }),
      pending: await Response.countDocuments({ responder: user._id, status: 'pending' }),
      rejected: await Response.countDocuments({ responder: user._id, status: 'rejected' })
    };

    const stats = {
      tasksAsAuthor,
      tasksAsExecutor,
      responses
    };

    const isOwner = req.session.userId && req.session.userId === user._id.toString();

    res.render('publicProfile', {
      title: `Профиль ${user.firstName || user.username}`,
      user: publicUserData,
      stats: stats,
      isOwner: isOwner,
      currentUserId: req.session.userId || null
    });

  } catch (error) {
    console.error('Ошибка загрузки публичного профиля:', error);
    res.status(500).render('error', {
      title: 'Ошибка сервера',
      error: 'Внутренняя ошибка сервера',
      message: 'Произошла ошибка при загрузке профиля пользователя.'
    });
  }
};