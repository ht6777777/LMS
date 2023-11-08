import { Model, Schema, model } from "mongoose"
import { IUser } from "./user.model"


interface IComment extends Document {
    user: IUser,
    question: string,
    questionReplies?: IComment[]
}

interface IReview extends Document {
    user: object,
    rating: number
    comment: string,
    commentReplies: IComment[]
}

interface ILink extends Document {
    title: string,
    url: string
}

interface ICourseData extends Document {
    title: string,
    description: string,
    videoUrl: string,
    videoLength: number,
    videoPlayer: string,
    videoSection: string,
    suggestions: string,
    questions: IComment[],
    link: ILink[] // links gives error
}

interface ICourse extends Document {
    name: string,
    description: string,
    price: number,
    estimatedPrice?: number,
    thumbnail: object,
    tags: string,
    level: string,
    demoUrl: string,
    benefits: {title: string}[],
    prerequisites: {title: string}[],
    reviews: IReview[],
    courseData: ICourseData[],
    ratings?: number,
    purchased?: number
}

const reviewSchema = new Schema<IReview>({
    user: Object,
    rating: {
        type: Number,
        default: 0
    },
    comment: String
});

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
});

const commentSchema = new Schema<IComment>({
    user: Object,
    question: String,
    questionReplies: [Object]
});

const courseDataSchema = new Schema<ICourseData>({
    title: String,
    description: String,
    videoUrl: String,
    videoLength: Number,
    videoPlayer: String,
    videoSection: String,
    suggestions: String,
    questions: [commentSchema],
    link: [linkSchema]
}); 

const courseSchema = new Schema<ICourse>({
    name: {
        required: true,
        type: String
    },
    description: {
        required: true,
        type: String
    },
    price: {
        required: true,
        type: Number
    },
    estimatedPrice: Number,
    thumbnail: {
        public_id: {
            // required: true, 
            type: String
        },
        url: {
            // required: true,
            type: String
        }
    },
    tags: {
        required: true,
        type: String
    },
    level: {
        required: true,
        type: String
    },
    demoUrl: {
        required: true,
        type: String
    },
    benefits: [{title: String}],
    prerequisites: [{title: String}],
    reviews: [reviewSchema],
    courseData: [courseDataSchema],
    ratings: {
        type: Number, 
        default: 0
    },
    purchased: {
        type: Number, 
        default: 0
    }
})

const courseModel: Model<ICourse> = model("Course", courseSchema);

export default courseModel;