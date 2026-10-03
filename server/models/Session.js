import mongoose from 'mongoose';

const responseItemSchema = new mongoose.Schema(
  {
    id: { type: String },
    prompt_id: { type: mongoose.Schema.Types.Mixed },
    prompt_word: { type: String, default: '' },
    prompt_themes: { type: [String], default: [] },
    order_index: { type: Number, required: true },
    user_text: { type: String, default: '' },
    wpm: { type: Number, default: 0 },
    filler_count: { type: Number, default: 0 },
    composure_score: { type: Number, default: 0.5 },
    sentiment_scores: { type: mongoose.Schema.Types.Mixed, default: null },
    emotion_scores: { type: mongoose.Schema.Types.Mixed, default: null },
    trait_scores: { type: mongoose.Schema.Types.Mixed, default: null },
    domain_traits: { type: [mongoose.Schema.Types.Mixed], default: [] },
    token_highlights: { type: [mongoose.Schema.Types.Mixed], default: null },
    features: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    module: {
      type: String,
      required: true,
      index: true,
      enum: ['ssb', 'interview', 'student', 'workplace'],
    },
    timer_seconds: {
      type: Number,
      default: 15,
    },
    is_complete: {
      type: Boolean,
      default: false,
    },
    overall_scores: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    overall_domain_traits: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    explanations: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    responses: {
      type: [responseItemSchema],
      default: [],
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for id matching React expectation
sessionSchema.virtual('session_id').get(function () {
  return this._id.toHexString();
});

sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
