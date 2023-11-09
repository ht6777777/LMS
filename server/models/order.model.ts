import { Model, Schema, model } from "mongoose"

export interface IOrder extends Document {
    courseId: string,
    userId: string,
    paymentInfo: object
};

export const orderSchema = new Schema<IOrder>({
    courseId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    paymentInfo: {
        type: Object,
        // required: true
    }
}, {timestamps: true});

const orderModel: Model<IOrder> = model('Order', orderSchema);

export default orderModel;