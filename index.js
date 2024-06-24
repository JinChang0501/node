// console.log(process.env.DB_USER);

// import { name } from "ejs";
import express from "express";
import multer from "multer";
import upload from "./utils/upload-img.js";
import admin2Router from "./routes/admin2.js";
import session from "express-session";
import moment from "moment-timezone";
import db from "./utils/connect-mysql.js";
import abRouter from "./routes/address-book.js";
import cors from "cors";
import mysql_session from "express-mysql-session";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { name } from "ejs";

//tmp_uploads 暫存的資料夾
// const upload = multer({ dest: "tmp_uploads/" });

const app = express();

//註冊樣板引擎
app.set("view engine", "ejs");

//Top Level Middleware
// 只會解析 application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// 只會解析 application/json
app.use(express.json());

const corsOptions = {
  Credentials: true,
  origin: function (origin, callback) {
    console.log({ origin });
    callback(null, true); //全部允許
  },
};

app.use(cors(corsOptions));

const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "加密",
    store: sessionStore,
    cookie: {
      maxAge: 1200_000,
    },
  })
);

//自訂頂層middleware
app.use((req, res, next) => {
  res.locals.title = "小新的網頁";
  res.locals.session = req.session;

  next();
});
//*********************Router***************
// 設定路由, 只允許用 GET 拜訪
app.get("/", (req, res) => {
  res.locals.title = "首頁 | " + res.locals.title;
  res.render("home", { name: "Jin" });
});

app.get("/json-sales", (req, res) => {
  const sales = [
    {
      name: "Bill",
      age: 28,
      id: "A001",
    },
    {
      name: "Peter",
      age: 32,
      id: "A002",
    },
    {
      name: "Carl",
      age: 29,
      id: "A003",
    },
  ];
  res.render("json-sales", { sales });
});

app.get("/try-qs", (req, res) => {
  res.json(req.query); // 查看 query string
});

app.get("/try-post-form", (req, res) => {
  res.render("try-post-form");
});

// const urlencodedParser = express.urlencoded({ extended: true });
app.post("/try-post-form", (req, res) => {
  // res.json(req.body);
  res.render("try-post-form", req.body);
});

app.post("/try-post", (req, res) => {
  res.json(req.body);
});

//UPLOAD
app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    body: req.body,
    file: req.file,
  });
});

//UPLOAD多個檔案到public/img
app.post("/try-uploads", upload.array("photos"), (req, res) => {
  res.json(req.files);
});

// 嚴謹的路徑規則
app.get("my-params1/my", (req, res) => {
  res.json("/my-params1/my");
});

// 寛鬆的路徑規則
app.get("/my-params1/:action?/:id?", (req, res) => {
  res.json(req.params);
});
app.get("/products/:pid", (req, res) => {
  res.json(req.params.pid);
});

app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3);
  u = u.split("?")[0];
  u = u.split("-").join("");
  res.json({ u });
});

app.use("/admin2", admin2Router);
// app.use(admin2Router);

app.use("/address-book", abRouter);

app.get("/try-sess", (req, res) => {
  // 要有 session 的 middleware 才有 req.session
  req.session.myNum ||= 1; // 如果 falsy 就設定為 1
  req.session.myNum++;
  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss"; //格式
  const m1 = moment(); // 當下時間的 moment 物件
  const m2 = moment(new Date()); // 當下時間的 moment 物件
  const m3 = moment("2023-05-28"); // 當下時間的 moment 物件

  res.json({
    m1a: m1.format(fm),
    m1b: m1.tz("Europe/London").format(fm),
    m2a: m2.format(fm),
    m2b: m2.tz("Europe/London").format(fm),
    m3a: m3.format(fm),
    m3b: m3.tz("Europe/London").format(fm),
  });
});

app.get("/try-moment2", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment("2024-02-29");
  const m2 = moment("2024-05-35");
  const m3 = moment("2023-02-29");
  res.json([
    m1.format(fm),
    m1.isValid(),
    m2.format(fm),
    m2.isValid(),
    m3.format(fm),
    m3.isValid(),
  ]);
});

app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM address_book LIMIT 3";

  const [result, fields] = await db.query(sql);

  res.json({ result, fields });
});

//login
app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", upload.none(), async (req, res) => {
  const output = {
    success: false,
    code: 0,
    body: req.body,
  };

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await db.query(sql, [req.body.email]);

  if (!rows.length) {
    output.code = 400;
    return res.json(output);
  }

  const result = await bcrypt.compare(req.body.password, rows[0].password);

  if (!result) {
    //密碼是錯的
    output.code = 420;
    return res.json(output);
  }
  output.success = true;
  //把狀態記錄在session裡
  req.session.admin = {
    id: rows[0].id,
    email: rows[0].email,
    nickname: rows[0].nickname,
  };
  res.json(output);
});

app.get("/logout", (req, res) => {
  delete req.session.admin;
  res.redirect("/");
});

//JWT
app.get("/jwt1", (req, res) => {
  const data = {
    id: 17,
    name: "Jin",
  };
  const token = jwt.sign(data, process.env.JWT_KEY);
  res.send(token);
  //eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsIm5hbWUiOiJKaW4iLCJpYXQiOjE3MTkxOTM0NzN9.x25mHOmZtw9pmUols8_KYrkGKZnxglcj10xw0QkwqRo
});

//驗證
app.get("/jwt2", (req, res) => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsIm5hbWUiOiJKaW4iLCJpYXQiOjE3MTkxOTM0NzN9.x25mHOmZtw9pmUols8_KYrkGKZnxglcj10xw0QkwqRo";
  const payload = jwt.verify(token, process.env.JWT_KEY);
  res.send(payload);
});

//密碼錯誤 try catch
app.get("/jwt3", (req, res) => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsIm5hbWUiOiJKaW4iLCJpYXQiOjE3MTkxOTM0NzN9.x25mHOmZtw9pmUols8_KYrkGKZnxglcj10xw0QkwqRo_";
  let payload = {};
  try {
    payload = jwt.verify(token, process.env.JWT_KEY);
  } catch (ex) {
    payload = { ex };
  }

  res.send(payload);
});
//*****************/
// 設定靜態內容資料夾
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

// ************ 要放在所有的路由設定之後
// use 接受所有 HTTP 方法
app.use((req, res) => {
  res.type("text/plain").status(404).send("走錯路了");
});

const port = process.env.WEB_PORT || 3002;

app.listen(port, () => {
  console.log(`Server start:port ${port}`);
});
