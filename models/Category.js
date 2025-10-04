import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true }, // Путь к иконке или класс (например, для FontAwesome)
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Category', categorySchema);