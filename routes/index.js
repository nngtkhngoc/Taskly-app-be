import authRouter from "./authRouter.js";
import taskRouter from "./taskRouter.js";

export const routes = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/task", taskRouter);
};
