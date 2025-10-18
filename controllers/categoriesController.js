import Category, { CATEGORY_TYPES } from '../models/Category.js';

export const getIndex = async (req, res) => {
  try {
    // Создаем массив типов категорий для удобства работы в шаблоне
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    res.render('admin/categories/index', {
      title: 'Категории',
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray
    });
  } catch (error) {
    console.log('Ошибка загрузки страницы категорий:', error);
    res.status(500).send('Ошибка загрузки страницы категорий');
  }
};

export const getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const categories = await Category.find({ type });

    // Создаем массив типов категорий для кнопки "Назад"
    const typesArray = Object.entries(CATEGORY_TYPES).map(([name, icon]) => ({
      name,
      icon
    }));

    res.render('admin/categories/index', {
      categories,
      selectedType: type,
      categoryTypes: CATEGORY_TYPES,
      typesArray: typesArray,
      title: `Категории: ${type}`
    });
  } catch (error) {
    console.log('Ошибка загрузки категорий по типу:', error);
    res.status(500).send('Ошибка загрузки категорий');
  }
};


export const getCreate = (req, res) => {
  res.render('admin/categories/create', {
    title: 'Создать категорию',
    categoryTypes: CATEGORY_TYPES
  });
};

export const postCreate = async (req, res) => {
  const { name, type } = req.body;
  console.log('Создание категории:', { name, type });
  try {
    const category = new Category({ name, type });
    await category.save();
    console.log('Категория создана:', category);
    res.redirect('/admin/categories');
  } catch (error) {
    console.log('Ошибка создания категории:', error);
    res.render('admin/categories/create', {
      error: 'Ошибка создания категории',
      title: 'Создать категорию',
      categoryTypes: CATEGORY_TYPES
    });
  }
};

export const getEdit = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Категория не найдена');
    }
    res.render('admin/categories/edit', { category, categoryTypes: CATEGORY_TYPES, title: 'Редактировать категорию' });
  } catch (error) {
    res.status(500).send('Ошибка загрузки категории');
  }
};

export const postEdit = async (req, res) => {
  const { name, type } = req.body;
  try {
    await Category.findByIdAndUpdate(req.params.id, { name, type });
    res.redirect('/admin/categories');
  } catch (error) {
    console.log('Ошибка обновления категории:', error);
    const category = await Category.findById(req.params.id);
    res.render('admin/categories/edit', {
      error: 'Ошибка обновления категории',
      title: 'Редактировать категорию',
      category,
      categoryTypes: CATEGORY_TYPES
    });
  }
};

export const postDelete = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin/categories');
  } catch (error) {
    res.status(500).send('Ошибка удаления категории');
  }
};