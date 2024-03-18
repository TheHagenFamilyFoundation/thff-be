import mongoose from 'mongoose';
const { Schema } = mongoose;

const grantSchema = Schema({
  year: {
    type: Number
  },
  description: {
    type: String
  },
  amount: {
    type: Number
  },
  city: {
    type: String
  },
  state: {
    type: String
  }
}, {
  timestamps: true
});

const Grant = mongoose.model('Grant', grantSchema);
export default Grant;
