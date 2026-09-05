const express = require("express");
const path = require("path");
const fs = require("fs");

const { runAgent } = require("./agent");

const app = express();
const PORT = 3000;

const universityFolder = path.resolve(__dirname, "university");
const dataFolder = path.resolve(__dirname, "data");
const conversationsFile = path.join(dataFolder, "conversations.json");

fs.mkdirSync(dataFolder, { recursive: true });

if (!fs.existsSync(conversationsFile)) {
  fs.writeFileSync(conversationsFile, "[]", "utf8");
}

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

function loadConversations() {
  try {
    return JSON.parse(fs.readFileSync(conversationsFile, "utf8"));
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  fs.writeFileSync(
    conversationsFile,
    JSON.stringify(conversations, null, 2),
    "utf8"
  );
}

function cleanFileName(name) {
  return path.basename(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function countUniversityFiles(dir) {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      count += countUniversityFiles(fullPath);
    } else {
      count++;
    }
  }
  return count;
}

app.get("/api/test", (req, res) => {
  res.json({
    message: "Study Agent Server is working!"
  });
});

// ===============================
// DASHBOARD
// ===============================

app.get("/api/dashboard", (req, res) => {
  const conversations = loadConversations();
  const messages = conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0
  );

  let quizzes = 0;

  try {
    const quizHistoryPath = path.join(dataFolder, "quiz_history.json");
    if (fs.existsSync(quizHistoryPath)) {
      quizzes = JSON.parse(
        fs.readFileSync(quizHistoryPath, "utf8")
      ).length;
    }
  } catch {
    quizzes = 0;
  }

  res.json({
    files: countUniversityFiles(universityFolder),
    conversations: conversations.length,
    messages,
    quizzes
  });
});

// ===============================
// CONVERSATIONS
// ===============================

app.get("/api/conversations", (req, res) => {
  const conversations = loadConversations();

  const result = conversations
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt
    }));

  res.json(result);
});

app.get("/api/conversations/:id", (req, res) => {
  const conversations = loadConversations();
  const conversation = conversations.find(
    (item) => item.id === req.params.id
  );

  if (!conversation) {
    return res.status(404).json({
      error: "Conversation not found."
    });
  }

  res.json(conversation);
});

app.delete("/api/conversations/:id", (req, res) => {
  const conversations = loadConversations();

  const filtered = conversations.filter(
    (item) => item.id !== req.params.id
  );

  saveConversations(filtered);

  res.json({ success: true });
});

// ===============================
// CHAT WITH AGENT
// ===============================

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    const conversationId = String(req.body.conversationId || "");
    const history = Array.isArray(req.body.history)
      ? req.body.history
      : [];

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    console.log("\nUser:", message);

    const answer = await runAgent(message, history);

    console.log("Agent:", answer);

    const conversations = loadConversations();
    let conversation = conversations.find(
      (item) => item.id === conversationId
    );

    if (!conversation) {
      conversation = {
        id: conversationId || Date.now().toString(),
        title: message.slice(0, 45) || "محادثة جديدة",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };

      conversations.push(conversation);
    }

    conversation.messages.push(
      {
        role: "user",
        content: message,
        timestamp: new Date().toISOString()
      },
      {
        role: "assistant",
        content: answer,
        timestamp: new Date().toISOString()
      }
    );

    conversation.updatedAt = new Date().toISOString();

    saveConversations(conversations);

    res.json({
      answer,
      conversationId: conversation.id
    });

  } catch (error) {
    console.error("Server Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// ===============================
// UPLOAD FILE
// ===============================

app.post("/api/upload", (req, res) => {
  try {
    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({
        error: "File name and file data are required."
      });
    }

    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".pptx",
      ".xlsx",
      ".xls",
      ".txt",
      ".md",
      ".csv",
      ".json"
    ];

    const safeName = cleanFileName(fileName);
    const extension = path.extname(safeName).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return res.status(400).json({
        error: "نوع الملف غير مدعوم."
      });
    }

    const uploadFolder = path.join(universityFolder, "uploads");
    fs.mkdirSync(uploadFolder, { recursive: true });

    const targetPath = path.join(uploadFolder, safeName);
    const buffer = Buffer.from(fileData, "base64");

    fs.writeFileSync(targetPath, buffer);

    res.json({
      success: true,
      fileName: safeName,
      path: "uploads/" + safeName
    });

  } catch (error) {
    console.error("Upload Error:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log("=================================");
  console.log("      STUDY AGENT SERVER");
  console.log("=================================");
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("");
});
