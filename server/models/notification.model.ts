import { Model, Schema, model } from "mongoose"

export interface INotification {
    title: string,
    message: string,
    status: string,
    userId: string
};

export const notificationSchema = new Schema<INotification>({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "unread"
    }  
});

const notificationModel: Model<INotification> = model("Notification", notificationSchema);

export default notificationModel;