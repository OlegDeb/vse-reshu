import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_-]+$/, // Только латиница, цифры, дефис и подчеркивание
    lowercase: true
  },
  firstName: {
    type: String,
    required: false,
    maxlength: 50,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    maxlength: 50,
    trim: true
  },
  password: { type: String, required: true },
  phone: { type: String, required: false },
  dateOfBirth: { type: Date, required: false },
  gender: {
    type: String,
    enum: ['мужской', 'женский'],
    required: false
  },
  avatar: {
    type: String,
    required: false
  },
  bio: {
    type: String,
    required: false,
    maxlength: 1000,
    trim: true
  },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null }
}, { timestamps: { createdAt: false, updatedAt: true } });

export default mongoose.model('User', userSchema);