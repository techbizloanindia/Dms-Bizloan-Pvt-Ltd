import mongoose from 'mongoose';

export interface IDocument {
  loanId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  uploadDate: Date;
  documentType: string;
  storageKey: string;
  isActive: boolean;
  uploadedBy: mongoose.Types.ObjectId;
}

const documentSchema = new mongoose.Schema<IDocument>({
  loanId: {
    type: String,
    required: [true, 'Loan ID is required'],
    trim: true,
    index: true
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    trim: true
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    trim: true,
    enum: [
      'Loan Agreement',
      'Payment Schedule',
      'Financial Statement',
      'KYC Document',
      'Bank Statement',
      'Invoice',
      'Other'
    ]
  },
  storageKey: {
    type: String,
    required: [true, 'Storage key is required'],
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Add indexes for better query performance
documentSchema.index({ loanId: 1, documentType: 1 });
documentSchema.index({ uploadDate: -1 });

const Document = mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema);

export default Document; 