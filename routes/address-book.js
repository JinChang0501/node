import express, { query } from "express";
import db from "./../utils/connect-mysql.js";
import moment from "moment-timezone";

const router = express.Router();
const dateFormat = "YYYY-MM-DD";

const getListData = async (req) => {
  let success = false;
  let redirect = "";

  const perPage = 25; //每頁最多25筆
  let page = parseInt(req.query.page) || 1;
  if (page < 1) {
    //return res.redirect("?page=1"); //跳轉頁面
    redirect = "?page=1";
    return { success, redirect };
  }

  let keyword = req.query.keyword || "";

  let where = " where 1 ";
  if (keyword) {
    where += ` AND\`name\` LIKE '%${keyword}%' `;
  }

  const t_sql = `SELECT count(*) totalRows FROM address_book ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let totalPages = 0;
  let rows = []; //分頁資料

  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);

    if (page > totalPages) {
      //return res.redirect(`?page=${totalPages}`); // 跳轉頁面
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }

    //取得分頁資料
    const sql = `SELECT *FROM address_book ${where} LIMIT ${
      (page - 1) * perPage
    },${perPage}`;
    [rows] = await db.query(sql);
    rows.forEach((el) => {
      el.birthday = moment(el.birthday).format(dateFormat);
    });
  }

  // res.json({ success, perPage, page, totalRows, totalPage, row });
  success = true;
  return {
    success,
    perPage,
    page,
    totalRows,
    totalPages,
    rows,
  };
};

router.get("/", async (req, res) => {
  res.locals.title = "通訊錄列表 | " + res.locals.title;
  res.locals.pageName = "ab_list";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  if (data.success) {
    res.render("address-book/list", data);
  }
});

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});
export default router;
