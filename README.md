# 🎓 AI Study Agent

An AI-powered study assistant built with **Node.js** and the **OpenAI API**.

The agent helps students study their university materials by searching and reading local course files, explaining topics, generating interactive quizzes, saving conversations, and providing a simple student dashboard.

---

## 🚀 Features

* 📚 **University Material Search**

  * Search through university files and folders.
  * Supports multiple file formats.

* 📄 **File Reading**

  * PDF
  * DOCX
  * PPTX
  * XLSX / XLS
  * TXT
  * Markdown
  * CSV
  * JSON

* 🤖 **AI Study Assistant**

  * Ask questions about course materials.
  * Get explanations and summaries.
  * Uses OpenAI's Responses API.

* 📝 **Interactive Quizzes**

  * Generates 5 multiple-choice questions.
  * Answers are checked automatically.
  * Provides explanations for answers.
  * Calculates the final score.

* 💬 **Conversation History**

  * Saves previous conversations locally.
  * Continue previous conversations.
  * Delete conversations when needed.

* 📊 **Student Dashboard**

  * Number of university files.
  * Number of conversations.
  * Number of messages.
  * Number of completed quizzes.

* 📁 **File Upload**

  * Upload study materials directly from the website.
  * Uploaded files are stored inside the `university/uploads` folder.

---

## 🛠️ Technologies Used

* **JavaScript**
* **Node.js**
* **Express.js**
* **OpenAI API**
* **HTML**
* **CSS**
* **REST API**
* **JSON**
* **Git & GitHub**

### Node.js Packages

* `openai`
* `express`
* `dotenv`
* `pdf-parse`
* `mammoth`
* `pptx-text-parser`
* `xlsx`

---

## 📂 Project Structure

```text
study-agent/
│
├── agent.js              # AI agent and tools
├── server.js             # Express server and API routes
├── package.json          # Project dependencies
├── package-lock.json
├── .gitignore
│
├── public/
│   ├── index.html        # Web interface
│   ├── app.js            # Frontend JavaScript
│   └── style.css         # Website styling
│
├── university/
│   ├── Course files...
│   └── uploads/          # Uploaded study materials
│
├── data/
│   ├── conversations.json
│   └── quiz_history.json
│
└── start-study-agent.vbs # Quick launcher
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Ibrahem-Khallid/study-agent.git
```

```bash
cd study-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your OpenAI API Key

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_api_key_here
```

⚠️ **Never upload your `.env` file or API key to GitHub.**

---

## 📚 Add University Materials

Place your course materials inside:

```text
university/
```

You can organize them into folders by course, semester, or level.

Example:

```text
university/
├── المستوى الأول/
├── المستوى الثاني/
├── المستوى الثالث/
└── ...
```

The AI agent can search these files and use their content when answering questions.

---

## ▶️ Run the Project

Start the server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

You can also use the included launcher:

```text
start-study-agent.vbs
```

---

## 🧠 How It Works

The project consists of three main parts:

### 1. Frontend

The frontend is built using:

* HTML
* CSS
* JavaScript

It provides the chat interface, dashboard, conversation history, quiz interaction, and file upload functionality.

### 2. Backend

The backend uses **Express.js** to:

* Receive user messages.
* Communicate with the AI agent.
* Save conversations.
* Handle file uploads.
* Provide dashboard statistics.

### 3. AI Agent

`agent.js` contains the main AI logic.

The agent can use tools to:

```text
list_files
search_files
read_file
start_quiz
save_quiz
get_current_question
answer_quiz
```

This allows the AI to interact with the student's study materials instead of relying only on general knowledge.

---

## 🔐 Security

The project uses a `.gitignore` file to prevent sensitive or unnecessary files from being uploaded to GitHub.

Ignored files include:

```text
.env
node_modules/
university/
data/
```

The university materials and API key therefore remain local to the machine.

---

## 🎯 Project Goal

The goal of this project is to build a practical AI-powered study assistant that can help students interact with their own university materials through natural language.

Instead of manually searching through many files, the student can ask the AI questions and request explanations, summaries, or quizzes.

---

## 🔮 Future Improvements

Possible future features:

* 📈 Advanced student performance analytics
* 🎯 Personalized study plans
* 📅 Exam and assignment reminders
* 🧠 Adaptive quizzes based on student performance
* 🔎 Improved semantic search
* 👥 Multi-user support
* ☁️ Cloud storage
* 🔐 User authentication
* 📱 Responsive mobile application

---

## 👨‍💻 Author

**Ibrahem Khalid**

Information Systems Student

---

## ⭐ Project Status

🚧 **Currently under development**

The project is being continuously improved with new AI-powered study features.
