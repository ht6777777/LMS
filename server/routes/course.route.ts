import express from "express";
import { addQuestion, editCourse, getAllCourses, getSingleCourse, getSingleCourseByUser, uploadCourse } from "../controllers/course.controller";
import { isRole, isAuthenticated } from "../middleware/auth";

const courseRouter = express.Router();

courseRouter.post('/course', isAuthenticated, isRole("admin"), uploadCourse);

courseRouter.put('/course/:id', isAuthenticated, isRole("admin"), editCourse);

courseRouter.get('/course/:id', getSingleCourse);

courseRouter.get('/course', getAllCourses);

courseRouter.get('/course/content/:id', isAuthenticated, getSingleCourseByUser);

courseRouter.put('/question', isAuthenticated, addQuestion);

export default courseRouter;