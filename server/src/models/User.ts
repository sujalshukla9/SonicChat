import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    firebaseUid: string;
    username: string;
    email: string;
    avatar: string;
    gender: 'male' | 'female';
    status: 'online' | 'offline' | 'away';
    lastSeen: Date;
    friends: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    avatar: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        default: 'male'
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away'],
        default: 'offline'
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Index for searching users by username
UserSchema.index({ username: 'text' });

export default mongoose.model<IUser>('User', UserSchema);
