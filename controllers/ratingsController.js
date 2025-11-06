import Rating from '../models/Rating.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

// Middleware для проверки аутентификации
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Оставить рейтинг
export const createRating = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { ratedUserId, rating, comment } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    // Проверяем, что задача существует и закрыта
    const task = await Task.findById(taskId)
      .populate('author', '_id')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: '_id'
        }
      });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    if (task.status !== 'closed') {
      return res.status(400).json({ success: false, error: 'Рейтинг можно оставить только после закрытия задачи' });
    }

    // Проверяем, что пользователь является участником задачи (заказчиком или исполнителем)
    const isAuthor = task.author._id.toString() === req.session.userId;
    const isExecutor = task.acceptedResponse && 
                       task.acceptedResponse.responder && 
                       task.acceptedResponse.responder._id.toString() === req.session.userId;

    if (!isAuthor && !isExecutor) {
      return res.status(403).json({ success: false, error: 'Вы не можете оценить этого пользователя' });
    }

    // Проверяем, что оцениваемый пользователь является участником задачи
    const authorId = task.author._id.toString();
    const executorId = task.acceptedResponse && task.acceptedResponse.responder 
                       ? task.acceptedResponse.responder._id.toString() 
                       : null;

    if (ratedUserId !== authorId && ratedUserId !== executorId) {
      return res.status(403).json({ success: false, error: 'Нельзя оценить этого пользователя' });
    }

    // Проверяем, что пользователь не оценивает сам себя
    if (ratedUserId === req.session.userId) {
      return res.status(400).json({ success: false, error: 'Нельзя оценить самого себя' });
    }

    // Проверяем, что пользователь еще не оставлял рейтинг для этой задачи
    const existingRating = await Rating.findOne({
      task: taskId,
      rater: req.session.userId
    });

    if (existingRating) {
      return res.status(400).json({ success: false, error: 'Вы уже оставили рейтинг для этой задачи' });
    }

    // Создаем рейтинг
    const newRating = new Rating({
      task: taskId,
      rater: req.session.userId,
      rated: ratedUserId,
      rating: parseInt(rating),
      comment: comment || ''
    });

    await newRating.save();

    // Обновляем средний рейтинг оцениваемого пользователя
    await updateUserRating(ratedUserId);

    res.json({ success: true, rating: newRating });
  } catch (error) {
    console.error('Ошибка создания рейтинга:', error);
    res.status(500).json({ success: false, error: 'Ошибка создания рейтинга: ' + error.message });
  }
};

// Получить рейтинги для задачи
export const getTaskRatings = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    const ratings = await Rating.find({ task: taskId })
      .populate('rater', 'firstName lastName username avatar')
      .populate('rated', 'firstName lastName username')
      .sort({ createdAt: -1 });

    res.json({ success: true, ratings });
  } catch (error) {
    console.error('Ошибка загрузки рейтингов:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки рейтингов' });
  }
};

// Получить рейтинги пользователя
export const getUserRatings = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const ratings = await Rating.find({ rated: user._id })
      .populate('rater', 'firstName lastName username avatar')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    // Вычисляем средний рейтинг
    const avgRating = await Rating.aggregate([
      { $match: { rated: user._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);

    const averageRating = avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : 0;

    res.json({ 
      success: true, 
      ratings, 
      averageRating,
      totalRatings: ratings.length
    });
  } catch (error) {
    console.error('Ошибка загрузки рейтингов пользователя:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки рейтингов' });
  }
};

// Обновить средний рейтинг пользователя
async function updateUserRating(userId) {
  try {
    const ratings = await Rating.find({ rated: userId });
    const totalRatings = ratings.length;
    
    if (totalRatings === 0) {
      await User.findByIdAndUpdate(userId, {
        $unset: { averageRating: 1, totalRatings: 1 }
      });
      return;
    }

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = Math.round((sum / totalRatings) * 10) / 10; // Округляем до одного знака после запятой

    await User.findByIdAndUpdate(userId, {
      averageRating,
      totalRatings
    });
  } catch (error) {
    console.error('Ошибка обновления рейтинга пользователя:', error);
  }
}

// Проверить, может ли пользователь оставить рейтинг
export const canRate = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    if (!req.session.userId) {
      return res.json({ success: true, canRate: false, reason: 'Требуется авторизация' });
    }

    const task = await Task.findById(taskId)
      .populate('author', '_id')
      .populate({
        path: 'acceptedResponse',
        populate: {
          path: 'responder',
          select: '_id'
        }
      });

    if (!task) {
      return res.json({ success: true, canRate: false, reason: 'Задача не найдена' });
    }

    if (task.status !== 'closed') {
      return res.json({ success: true, canRate: false, reason: 'Задача не закрыта' });
    }

    // Проверяем, является ли пользователь участником задачи
    const isAuthor = task.author._id.toString() === req.session.userId;
    const isExecutor = task.acceptedResponse && 
                       task.acceptedResponse.responder && 
                       task.acceptedResponse.responder._id.toString() === req.session.userId;

    if (!isAuthor && !isExecutor) {
      return res.json({ success: true, canRate: false, reason: 'Вы не являетесь участником задачи' });
    }

    // Проверяем, оставлял ли пользователь уже рейтинг
    const existingRating = await Rating.findOne({
      task: taskId,
      rater: req.session.userId
    });

    if (existingRating) {
      return res.json({ 
        success: true, 
        canRate: false, 
        reason: 'Вы уже оставили рейтинг',
        existingRating: true
      });
    }

    // Определяем, кого можно оценить
    const authorId = task.author._id.toString();
    const executorId = task.acceptedResponse && task.acceptedResponse.responder 
                       ? task.acceptedResponse.responder._id.toString() 
                       : null;

    let canRateUser = null;
    if (isAuthor && executorId) {
      canRateUser = executorId; // Заказчик может оценить исполнителя
    } else if (isExecutor && authorId) {
      canRateUser = authorId; // Исполнитель может оценить заказчика
    }

    return res.json({ 
      success: true, 
      canRate: !!canRateUser,
      canRateUserId: canRateUser,
      isAuthor,
      isExecutor
    });
  } catch (error) {
    console.error('Ошибка проверки возможности оценить:', error);
    res.status(500).json({ success: false, error: 'Ошибка проверки' });
  }
};

