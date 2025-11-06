import City, { REGION_TYPES } from '../models/City.js';

export const getIndex = async (req, res) => {
  try {
    // Создаем массив регионов для удобства работы в шаблоне
    const regionsArray = REGION_TYPES.map((name) => ({
      name
    }));

    res.render('admin/cities/index', {
      title: 'Города',
      regionTypes: REGION_TYPES,
      regionsArray: regionsArray
    });
  } catch (error) {
    console.log('Ошибка загрузки страницы городов:', error);
    res.status(500).send('Ошибка загрузки страницы городов');
  }
};

export const getCitiesByRegion = async (req, res) => {
  try {
    const { region } = req.params;
    const cities = await City.find({ region });

    // Создаем массив регионов для кнопки "Назад"
    const regionsArray = REGION_TYPES.map((name) => ({
      name
    }));

    res.render('admin/cities/index', {
      cities,
      selectedRegion: region,
      regionTypes: REGION_TYPES,
      regionsArray: regionsArray,
      title: `Города: ${region}`
    });
  } catch (error) {
    console.log('Ошибка загрузки городов по региону:', error);
    res.status(500).send('Ошибка загрузки городов');
  }
};


export const getCreate = (req, res) => {
  res.render('admin/cities/create', {
    title: 'Создать город',
    regionTypes: REGION_TYPES
  });
};

export const postCreate = async (req, res) => {
  const { name, region } = req.body;
  console.log('Создание города:', { name, region });
  try {
    const city = new City({ name, region });
    await city.save();
    console.log('Город создан:', city);
    res.redirect('/admin/cities');
  } catch (error) {
    console.log('Ошибка создания города:', error);
    res.render('admin/cities/create', {
      error: 'Ошибка создания города',
      title: 'Создать город',
      regionTypes: REGION_TYPES
    });
  }
};

export const getEdit = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).send('Город не найден');
    }
    res.render('admin/cities/edit', { city, regionTypes: REGION_TYPES, title: 'Редактировать город' });
  } catch (error) {
    res.status(500).send('Ошибка загрузки города');
  }
};

export const postEdit = async (req, res) => {
  const { name, region } = req.body;
  try {
    await City.findByIdAndUpdate(req.params.id, { name, region });
    res.redirect('/admin/cities');
  } catch (error) {
    console.log('Ошибка обновления города:', error);
    const city = await City.findById(req.params.id);
    res.render('admin/cities/edit', {
      error: 'Ошибка обновления города',
      title: 'Редактировать город',
      city,
      regionTypes: REGION_TYPES
    });
  }
};

export const postDelete = async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.redirect('/admin/cities');
  } catch (error) {
    res.status(500).send('Ошибка удаления города');
  }
};


