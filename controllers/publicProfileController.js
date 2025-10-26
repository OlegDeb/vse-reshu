import User from '../models/User.js';

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

    // Определяем публичные поля пользователя
    const publicUserData = {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      // Добавляем форматированную дату для отображения
      createdAtFormatted: user.createdAt.toLocaleDateString('ru-RU'),
      // Можно добавить другие публичные поля по мере необходимости
      // Например: avatar, bio, publicStats и т.д.
    };

    res.render('publicProfile', {
      title: `Профиль ${user.firstName || user.username}`,
      user: publicUserData,
      isOwner: req.session.userId && req.session.userId === user._id.toString()
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