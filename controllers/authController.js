import bcrypt from 'bcryptjs';
import User from '../models/User.js';

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
  res.render('login', { title: 'Вход' });
};

export const postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect('/profile');
    } else {
      res.render('login', { error: 'Неверный email или пароль' });
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
    res.render('profile', { user: userObj, title: 'Профиль' });
  } catch (error) {
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

  const { username, firstName, lastName, phone, dateOfBirth, gender } = req.body;

  try {
    const user = await User.findById(req.session.userId);

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

    // Обновляем дату последнего входа
    user.lastLogin = new Date();

    await user.save();

    res.redirect('/profile');
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.redirect('/profile');
  }
};