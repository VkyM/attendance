const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(express.static("public"));


// File paths
const USERS_FILE = "./users.json";
const ATT_FILE = "./attendance.json";
const LEAVE_FILE = "./leaves.json";

// Read/Write JSON helpers
const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJSON = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// --- Login ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const today = new Date().toISOString().split("T")[0];
  const attendance = readJSON(ATT_FILE);
  const already = attendance.find(
    (a) => a.username === username && a.date === today
  );

  if (already) {
    return res.json({
      message: `Welcome back ${username}! Already logged in today.`,
      alreadyLogged: true,
    });
  }

  const loginTime = new Date().toLocaleTimeString("en-IN", {
    hour12: false,
  });
  attendance.push({ username, date: today, loginTime });
  writeJSON(ATT_FILE, attendance);

  res.json({
    message: `Welcome ${username}, logged in at ${loginTime}`,
    user,
  });
});

// --- Admin: Monthly Attendance View ---
app.get("/admin/attendance/:month", (req, res) => {
  const { month } = req.params; // e.g. "2025-10"
  const attendance = readJSON(ATT_FILE).filter((a) => a.date.startsWith(month));

  const result = attendance.map((a) => {
    const hour = parseInt(a.loginTime.split(":")[0]);
    const late = hour >= 9;
    return { ...a, late };
  });

  res.json(result);
});

// --- Apply Leave ---
app.post("/leave", (req, res) => {
  const { username, date, reason } = req.body;
  if (!username || !date)
    return res.status(400).json({ message: "username and date required" });

  const leaves = readJSON(LEAVE_FILE);
  leaves.push({
    username,
    date,
    reason,
    status: "Pending",
    appliedOn: new Date().toISOString(),
  });
  writeJSON(LEAVE_FILE, leaves);

  res.json({ message: "Leave applied successfully" });
});

// --- View User Profile ---
app.get("/profile/:username", (req, res) => {
  const { username } = req.params;

  const users = readJSON(USERS_FILE);
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(404).json({ message: "User not found" });

  const attendance = readJSON(ATT_FILE).filter((a) => a.username === username);
  const leaves = readJSON(LEAVE_FILE).filter((l) => l.username === username);

  res.json({
    username: user.username,
    role: user.role,
    attendance,
    leaves,
  });
});

// --- Admin: View all leave requests ---
app.get("/admin/leaves", (req, res) => {
  const leaves = readJSON(LEAVE_FILE);
  res.json(leaves);
});

// --- Admin: Get user list ---
app.get("/users.json", (req, res) => {
  const users = readJSON(USERS_FILE);
  res.json(users);
});



// --- Admin: Approve or Reject Leave ---
app.post("/admin/leave/update", (req, res) => {
  const { username, date, status } = req.body;
  const leaves = readJSON(LEAVE_FILE);
  const leave = leaves.find(
    (l) => l.username === username && l.date === date
  );
  if (!leave) return res.status(404).json({ message: "Leave not found" });

  leave.status = status;
  writeJSON(LEAVE_FILE, leaves);
  res.json({ message: `Leave ${status} for ${username}` });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
