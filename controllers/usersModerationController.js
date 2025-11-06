import User from '../models/User.js';

// Список всех пользователей с фильтрацией
export const getUsersIndex = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const banStatus = req.query.banStatus || '';
    const search = req.query.search || '';

    // Формируем запрос
    const query = {};
    
    if (banStatus) {
      query.banStatus = banStatus;
    }
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('bannedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // Форматируем даты
    users.forEach(user => {
      user.createdAtFormatted = user.createdAt.toLocaleDateString('ru-RU');
      if (user.banUntil) {
        user.banUntilFormatted = user.banUntil.toLocaleDateString('ru-RU');
      }
      if (user.bannedAt) {
        user.bannedAtFormatted = user.bannedAt.toLocaleDateString('ru-RU');
      }
    });

    const pages = [];
    for (let i = 1; i <= totalPages && i <= 10; i++) {
      pages.push(i);
    }

    res.render('admin/users/index', {
      title: 'Модерация пользователей',
      users,
      currentPage: page,
      totalPages,
      pages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      prevPage: page - 1,
      nextPage: page + 1,
      currentBanStatus: banStatus,
      currentSearch: search,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    res.status(500).send('Ошибка загрузки пользователей');
  }
};

// Детальная страница пользователя
export const getUserShow = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('bannedBy', 'username firstName lastName')
      .populate('warnings.issuedBy', 'username firstName lastName');

    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    // Форматируем даты
    user.createdAtFormatted = user.createdAt.toLocaleDateString('ru-RU');
    if (user.banUntil) {
      user.banUntilFormatted = user.banUntil.toLocaleDateString('ru-RU');
      user.banUntilFormattedFull = user.banUntil.toLocaleString('ru-RU');
    }
    if (user.bannedAt) {
      user.bannedAtFormatted = user.bannedAt.toLocaleDateString('ru-RU');
      user.bannedAtFormattedFull = user.bannedAt.toLocaleString('ru-RU');
    }

    // Форматируем предупреждения
    user.warnings.forEach(warning => {
      warning.issuedAtFormatted = warning.issuedAt.toLocaleString('ru-RU');
    });

    res.render('admin/users/show', {
      title: `Модерация: ${user.username}`,
      user: user.toObject(),
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Ошибка загрузки пользователя:', error);
    res.status(500).send('Ошибка загрузки пользователя');
  }
};

// Выдать предупреждение
export const postAddWarning = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.params.id;
    const moderatorId = req.session.userId;

    if (!reason || reason.trim() === '') {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Укажите причину предупреждения')}`);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    user.warnings.push({
      reason: reason.trim(),
      issuedBy: moderatorId,
      issuedAt: new Date()
    });

    await user.save();

    res.redirect(`/admin/users/${userId}?success=${encodeURIComponent('Предупреждение выдано')}`);
  } catch (error) {
    console.error('Ошибка выдачи предупреждения:', error);
    res.redirect(`/admin/users/${req.params.id}?error=${encodeURIComponent('Ошибка выдачи предупреждения')}`);
  }
};

// Удалить предупреждение
export const postRemoveWarning = async (req, res) => {
  try {
    const userId = req.params.id;
    const warningId = req.params.warningId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    user.warnings = user.warnings.filter(
      warning => warning._id.toString() !== warningId
    );

    await user.save();

    res.redirect(`/admin/users/${userId}?success=${encodeURIComponent('Предупреждение удалено')}`);
  } catch (error) {
    console.error('Ошибка удаления предупреждения:', error);
    res.redirect(`/admin/users/${req.params.id}?error=${encodeURIComponent('Ошибка удаления предупреждения')}`);
  }
};

// Временный бан
export const postTemporaryBan = async (req, res) => {
  try {
    const { reason, banDays } = req.body;
    const userId = req.params.id;
    const moderatorId = req.session.userId;

    if (!reason || reason.trim() === '') {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Укажите причину бана')}`);
    }

    const days = parseInt(banDays) || 7;
    if (days < 1 || days > 365) {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Количество дней должно быть от 1 до 365')}`);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    if (user.role === 'admin') {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Нельзя забанить администратора')}`);
    }

    const banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + days);

    user.banStatus = 'temporary';
    user.banUntil = banUntil;
    user.banReason = reason.trim();
    user.bannedBy = moderatorId;
    user.bannedAt = new Date();

    await user.save();

    const successMsg = `Пользователь забанен на ${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
    res.redirect(`/admin/users/${userId}?success=${encodeURIComponent(successMsg)}`);
  } catch (error) {
    console.error('Ошибка временного бана:', error);
    res.redirect(`/admin/users/${req.params.id}?error=${encodeURIComponent('Ошибка временного бана')}`);
  }
};

// Постоянный бан
export const postPermanentBan = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.params.id;
    const moderatorId = req.session.userId;

    if (!reason || reason.trim() === '') {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Укажите причину бана')}`);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    if (user.role === 'admin') {
      return res.redirect(`/admin/users/${userId}?error=${encodeURIComponent('Нельзя забанить администратора')}`);
    }

    user.banStatus = 'permanent';
    user.banUntil = null;
    user.banReason = reason.trim();
    user.bannedBy = moderatorId;
    user.bannedAt = new Date();

    await user.save();

    res.redirect(`/admin/users/${userId}?success=${encodeURIComponent('Пользователь забанен навсегда')}`);
  } catch (error) {
    console.error('Ошибка постоянного бана:', error);
    res.redirect(`/admin/users/${req.params.id}?error=${encodeURIComponent('Ошибка постоянного бана')}`);
  }
};

// Разбан
export const postUnban = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    user.banStatus = 'none';
    user.banUntil = null;
    user.banReason = null;
    user.bannedBy = null;
    user.bannedAt = null;

    await user.save();

    res.redirect(`/admin/users/${userId}?success=${encodeURIComponent('Пользователь разбанен')}`);
  } catch (error) {
    console.error('Ошибка разбана:', error);
    res.redirect(`/admin/users/${req.params.id}?error=${encodeURIComponent('Ошибка разбана')}`);
  }
};

