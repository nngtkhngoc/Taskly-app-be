import Joi from "@hapi/joi";

export const createTaskValidator = Joi.object({
  name: Joi.string().max(255).required().messages({
    "string.empty": "Task name must not be empty",
    "any.required": "Task name is required",
    "string.max": "Task name must not be over 255 characters",
  }),
  note: Joi.string(),
  is_urgent: Joi.boolean(),
  is_important: Joi.boolean(),
  category: Joi.array().min(1).required().messages({
    "array.min": "Task category must be provided",
    "any.required": "Task category is required",
  }),
  deadline: Joi.date().required().min("now").messages({
    "any.required": "Deadline is required",
    "date.min": "Date must not be in the past.",
  }),
});

export const updateTaskValidator = Joi.object({
  name: Joi.string().max(255).messages({
    "string.empty": "Task name must not be empty",
    "string.max": "Task name must not be over 255 characters",
  }),
  note: Joi.string(),
  is_urgent: Joi.boolean(),
  is_important: Joi.boolean(),
  category: Joi.array().min(1).messages({
    "array.min": "Task category must be provided",
  }),
  deadline: Joi.date().min("now").messages({
    "date.min": "Date must not be in the past.",
  }),
});
