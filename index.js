// console.log(process.env.DB_USER);

// import { name } from "ejs";
import express from "express";
import multer from "multer";

const upload = multer({ dest: "tmp_uploads/" });

const app = express();

//註冊樣板引擎
app.set("view engine", "ejs");

//Top Level Middleware
app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// 設定路由, 只允許用 GET 拜訪
app.get("/", (req, res) => {
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

// const urlencodeedParser = express.urlencoded({ extended: true });
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
