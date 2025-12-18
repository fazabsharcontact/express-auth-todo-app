import express from "express";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = express();
const port = 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const usersFile = path.join(__dirname, "data", "users.json");
const todosFile = path.join(__dirname, "data", "todos.json");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
    session({
        secret: "secret-key",
        resave: false,
        saveUninitialized: false
    })
);

app.use((req, res, next) => {
    res.locals.user = req.session.userId
        ? { username: req.session.username }
        : null;
    next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

function loadTodos() {
    try {
        const data = (fs.readFileSync(todosFile, "utf-8"));
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveTodos(todos) {
    fs.writeFileSync(todosFile, JSON.stringify(todos, null, 2));
}

function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function isAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }

    next();
}

app.get("/", (req, res) => {
    if (req.session.userId) {
        return res.redirect("/todos");
    }

    res.redirect("/login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const { username, password } = req.body;

    const users = loadUsers();

    const exitingUser = users.find(u => u.username === username);
    if (exitingUser) {
        return res.send("Username sudah digunakan.");
    }

    users.push({
        id: Date.now().toString(),
        username,
        password
    });

    saveUsers(users);
    res.redirect("/login");
});

app.get("/login", (req,res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const users = loadUsers();
    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        return res.send("Username atau Password salah!!");
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.redirect("/todos");
});

app.get("/todos", isAuth, (req, res) => {
    const todos = loadTodos();

    const userTodos = todos.filter(
        t => t.userId === req.session.userId
    );

    res.render("todos", { todos: userTodos });
});

app.post("/todos", isAuth, (req, res) => {
    const { text } = req.body;

    const todos = loadTodos();

    todos.push({
        id: Date.now().toString(),
        text,
        userId: req.session.userId
    });

    saveTodos(todos);
    res.redirect("/todos");
});

app.post("/todos/:id/delete", isAuth, (req, res) => {
    const { id } = req.params;

    let todos = loadTodos();

    todos = todos.filter(
        t => !(t.id === id && t.userId === req.session.userId)
    );

    saveTodos(todos);
    res.redirect("/todos");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});

