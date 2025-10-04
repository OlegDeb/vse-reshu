import Category from '../models/Category.js';

export const getIndex = async (req, res) => {
  try {
    const categories = await Category.find();
    console.log('Категории:', categories);
    res.render('admin/categories/index', { categories, title: 'Категории' });
  } catch (error) {
    console.log('Ошибка загрузки категорий:', error);
    res.status(500).send('Ошибка загрузки категорий');
  }
};

export const getCreate = (req, res) => {
  res.render('admin/categories/create', { title: 'Создать категорию' });
};

export const postCreate = async (req, res) => {
  const { name, icon } = req.body;
  console.log('Создание категории:', { name, icon });
  try {
    const category = new Category({ name, icon });
    await category.save();
    console.log('Категория создана:', category);
    res.redirect('/admin/categories');
  } catch (error) {
    console.log('Ошибка создания категории:', error);
    res.render('admin/categories/create', { error: 'Ошибка создания категории', title: 'Создать категорию' });
  }
};

export const getEdit = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Категория не найдена');
    }
    res.render('admin/categories/edit', { category, title: 'Редактировать категорию' });
  } catch (error) {
    res.status(500).send('Ошибка загрузки категории');
  }
};

export const postEdit = async (req, res) => {
  const { name, icon } = req.body;
  try {
    await Category.findByIdAndUpdate(req.params.id, { name, icon });
    res.redirect('/admin/categories');
  } catch (error) {
    res.render('admin/categories/edit', { error: 'Ошибка обновления категории', title: 'Редактировать категорию' });
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