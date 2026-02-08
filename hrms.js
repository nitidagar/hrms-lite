process.stdin.setEncoding("utf8");

const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

require("dotenv").config({ path: path.resolve(__dirname, "credentials/.env") });

const uri = process.env.MONGO_CONNECTION_STRING;

const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Static files (CSS)
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: false }));

const portNumber = process.argv[2] || 3000;

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

// ---------- DB Helper ----------
async function withDB(callback) {
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection(process.env.MONGO_COLLECTION);
    await callback(collection);
  } catch (err) {
    console.error("Database error:", err);
  }
}

// ---------- Routes ----------

app.get("/", (req, res) => {
  res.render("index");
});

// Employees list + filter by date (bonus)
app.get("/employees", async (req, res) => {
  const selectedDate = req.query.date || "";

  await withDB(async (collection) => {
    let employees = await collection.find({}).toArray();

    if (selectedDate) {
      employees = employees.map(emp => {
        const filteredAttendance = (emp.attendance || []).filter(a => a.date === selectedDate);
        return { ...emp, attendance: filteredAttendance };
      });
    }

    res.render("employees", { employees, selectedDate });
  });
});

app.get("/add-employee", (req, res) => {
  res.render("add-employee");
});

app.post("/add-employee", async (req, res) => {
  const { employeeId, fullName, email, department } = req.body;

  await withDB(async (collection) => {
    await collection.insertOne({
      employeeId,
      fullName,
      email,
      department,
      attendance: [],
    });
    res.redirect("/employees");
  });
});

app.post("/delete-employee", async (req, res) => {
  const { employeeId } = req.body;

  await withDB(async (collection) => {
    await collection.deleteOne({ employeeId });
    res.redirect("/employees");
  });
});

// Attendance page + filter by date (bonus)
app.get("/attendance", async (req, res) => {
  const filterDate = req.query.date || "";

  await withDB(async (collection) => {
    let employees = await collection.find({}).toArray();

    if (filterDate) {
      employees = employees.map(emp => {
        const filtered = (emp.attendance || []).filter(a => a.date === filterDate);
        return { ...emp, attendance: filtered };
      });
    }

    res.render("attendance", { employees, filterDate });
  });
});

// Mark attendance (duplicate-safe)
app.post("/attendance", async (req, res) => {
  const { employeeId, date, status } = req.body;

  await withDB(async (collection) => {
    const emp = await collection.findOne({ employeeId });

    const alreadyMarked = emp.attendance.find(a => a.date === date);

    if (alreadyMarked) {
      await collection.updateOne(
        { employeeId, "attendance.date": date },
        { $set: { "attendance.$.status": status } }
      );
    } else {
      await collection.updateOne(
        { employeeId },
        { $push: { attendance: { date, status } } }
      );
    }
  });

  res.redirect("/attendance");
});

// Dashboard (bonus)
app.get("/dashboard", async (req, res) => {
  await withDB(async (collection) => {
    const employees = await collection.find({}).toArray();

    const totalEmployees = employees.length;

    let totalAttendance = 0;
    let totalPresent = 0;

    employees.forEach(emp => {
      if (emp.attendance && emp.attendance.length) {
        totalAttendance += emp.attendance.length;
        totalPresent += emp.attendance.filter(a => a.status === "Present").length;
      }
    });

    res.render("dashboard", {
      totalEmployees,
      totalAttendance,
      totalPresent
    });
  });
});

// ---------- Server ----------
app.listen(portNumber, () => {
  console.log(`✅ HRMS running on http://localhost:${portNumber}`);
});
