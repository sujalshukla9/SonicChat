import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    content: string;
    sender: mongoose.Types.ObjectId;
    senderUsername: string;
    room: string;
    type: 'text' | 'image' | 'file' | 'system';
    isPrivate: boolean;
    recipient?: mongoose.Types.ObjectId;
    readBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderUsername: {
        type: String,
        required: true
    },
    room: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Index for efficient querying
MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
