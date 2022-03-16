const express = require("express");
const { Todo } = require("../mongo");
const redis = require("../redis");
const router = express.Router();

const redis_todos_key = "added_todos";

/* GET todos listing. */
router.get("/", async (_, res) => {
  const todos = await Todo.find({});
  res.send(todos);
});

router.get("/statistics", async (_, res) => {
  const value = (await redis.getAsync(redis_todos_key)) ?? 0;
  const response = {
    added_todos: parseInt(value),
  };
  res.json(response);
});

/* POST todo to listing. */
router.post("/", async (req, res) => {
  const todo = await Todo.create({
    text: req.body.text,
    done: false,
  });
  const value = (await redis.getAsync(redis_todos_key)) ?? 0;
  await redis.setAsync(redis_todos_key, value + 1);
  res.send(todo);
});

const singleRouter = express.Router();

const findByIdMiddleware = async (req, res, next) => {
  const { id } = req.params;
  req.todo = await Todo.findById(id);
  if (!req.todo) return res.sendStatus(404);

  next();
};

/* DELETE todo. */
singleRouter.delete("/", async (req, res) => {
  await req.todo.delete();
  res.sendStatus(200);
});

/* GET todo. */
singleRouter.get("/", async (req, res) => {
  res.send(req.todo);
});

/* PUT todo. */
singleRouter.put("/", async (req, res) => {
  const body = req.body;
  const todo = req.todo;

  if (body.text) todo.text = body.text;
  if (body.done !== undefined) todo.done = body.done;

  const updated_todo = await Todo.findByIdAndUpdate(todo.id, todo, {
    new: true,
  });

  res.send(updated_todo);
});

router.use("/:id", findByIdMiddleware, singleRouter);

module.exports = router;
