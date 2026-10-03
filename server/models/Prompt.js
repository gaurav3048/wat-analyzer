import mongoose from 'mongoose';

const promptSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      index: true,
      enum: ['ssb', 'interview', 'student', 'workplace'],
    },
    word: {
      type: String,
      required: true,
    },
    themes: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: Number,
      default: 1,
    },
    language: {
      type: String,
      default: 'en',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Prompt = mongoose.model('Prompt', promptSchema);
export default Prompt;
