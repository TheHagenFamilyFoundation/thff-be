import mongoose from 'mongoose';
const { Schema } = mongoose;

const organizationInfoSchema = Schema({
  organizationInfoID: {
    type: String,
    unique: true
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
    // US ZIP as string so leading zeros (e.g. 02139) are preserved; supports optional ZIP+4.
    // Setter accepts legacy numeric JSON / BSON int and stores as string.
    type: String,
    trim: true,
    set(v) {
      if (v === null || v === undefined) {
        return v;
      }
      return String(v).trim();
    },
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
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      if (ret != null && Object.prototype.hasOwnProperty.call(ret, 'zip') && ret.zip != null) {
        ret.zip = String(ret.zip);
      }
      return ret;
    },
  },
  toObject: {
    transform(_doc, ret) {
      if (ret != null && Object.prototype.hasOwnProperty.call(ret, 'zip') && ret.zip != null) {
        ret.zip = String(ret.zip);
      }
      return ret;
    },
  },
});

const OrganizationInfo = mongoose.model('OrganizationInfo', organizationInfoSchema);
export default OrganizationInfo;
