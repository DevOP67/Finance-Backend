const jwt = require("jsonwebtoken");
const { generateToken, SECRET } = require("../middleware/auth");
const userService = require("../services/userService");
const { AppError } = require("../middleware/errorHandler");

async function register(req, res, next) {
  try {
    const first = await userService.isFirstUser();
    if (!first) {
      const header = req.headers.authorization;
      if (!header) return next(new AppError("Auth required", 401, "UNAUTHORIZED"));
      try {
        const payload = jwt.verify(header.replace("Bearer ", ""), SECRET);
        const caller  = await userService.findById(payload.id);
        if (!caller || caller.role !== "admin")
          return next(new AppError("Only admins can create users", 403, "FORBIDDEN"));
      } catch { return next(new AppError("Invalid token", 401, "UNAUTHORIZED")); }
    }
    const role = first ? "admin" : (req.body.role || "viewer");
    const user = await userService.createUser({ ...req.body, role });
    res.status(201).json({ user, token: generateToken(user) });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const user = await userService.findByEmail(req.body.email);
    if (!user || !(await userService.verifyPassword(user, req.body.password)))
      return next(new AppError("Invalid credentials", 401, "UNAUTHORIZED"));
    if (user.status !== "active")
      return next(new AppError("Account is inactive", 403, "FORBIDDEN"));
    const { password_hash, ...safe } = user;
    res.json({ user: safe, token: generateToken(user) });
  } catch (err) { next(err); }
}

async function listUsers(req, res, next) {
  try {
    const users = await userService.listAll();
    res.json({ users, total: users.length });
  } catch (err) { next(err); }
}

async function getMe(req, res) {
  const { password_hash, ...safe } = req.user;
  res.json({ user: safe });
}

async function getUser(req, res, next) {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) return next(new AppError("User not found", 404, "NOT_FOUND"));
    res.json({ user });
  } catch (err) { next(err); }
}

async function patchUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ user });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    await userService.softDeleteUser(req.params.id, req.user.id);
    res.json({ message: "User deleted" });
  } catch (err) { next(err); }
}

module.exports = { register, login, listUsers, getMe, getUser, patchUser, deleteUser };
