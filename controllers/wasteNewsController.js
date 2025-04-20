const WasteNews = require('../models/wasteNews');

// CREATE
const createWasteNews = async (req, res) => {
  try {
    const { title, content } = req.body;
    const newNews = new WasteNews({ title, content });
    await newNews.save();
    res.status(201).json(newNews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create news' });
  }
};

// READ (all)
const getWasteNews = async (req, res) => {
  try {
    const news = await WasteNews.find().sort({ date: -1 }).limit(5);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// READ (single by ID)
const getSingleWasteNews = async (req, res) => {
  try {
    const news = await WasteNews.findById(req.params.id);
    if (!news) return res.status(404).json({ error: 'News not found' });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// UPDATE
const updateWasteNews = async (req, res) => {
  try {
    const { title, content } = req.body;
    const updatedNews = await WasteNews.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true }
    );
    if (!updatedNews) return res.status(404).json({ error: 'News not found' });
    res.json(updatedNews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update news' });
  }
};

// DELETE
const deleteWasteNews = async (req, res) => {
  try {
    const deleted = await WasteNews.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'News not found' });
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
};

module.exports = {
  createWasteNews,
  getWasteNews,
  getSingleWasteNews,
  updateWasteNews,
  deleteWasteNews
};
