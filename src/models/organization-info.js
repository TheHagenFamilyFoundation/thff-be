import mongoose from 'mongoose';
const { Schema } = mongoose;

const organizationInfoSchema = Schema({
  organizationInfoID: {
    type: String,
  },
  legalName: {
    //  -Legal Name of Organization Applying:
    type: String,
    //required: 'true',
    unique: true, // Yes unique one
  },
  yearFounded: {
    // -Year Founded
    type: Number,
  },
  currentOperatingBudget: {
    // -Current Operating Budget
    type: Number,
  },
  director: {
    type: String,
  },
  phone: {
    // -Phone Number
    type: String,
  },
  contactPerson: {
    //-Contact person/title/phone number
    type: String,
  },
  contactPersonTitle: {
    //  contact person's title
    type: String,
  },
  contactPersonPhoneNumber: {
    type: String,
  },
  email: {
    //  email
    type: String,
  },
  address: {
    //-Address (principal/administrative office)
    type: String,
  },
  city: {
    //  city
    type: String,
  },
  state: {
    //  state
    type: String,
  },
  zip: {
    // -zip
    type: Number,
  },
  fax: {
    // -fax number
    type: String,
  },
  website: {
    type: String,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  validOrgInfo: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

const OrganizationInfo = mongoose.model('OrganizationInfo', organizationInfoSchema);
export default OrganizationInfo;
