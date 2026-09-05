require("dotenv").config();

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const OpenAI = require("openai");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const pptxTextParser = require("pptx-text-parser");
const XLSX = require("xlsx");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const universityFolder = path.resolve(__dirname, "university");
const dataFolder = path.resolve(__dirname, "data");
const quizHistoryFile = path.join(dataFolder, "quiz_history.json");

fs.mkdirSync(dataFolder, { recursive: true });

if (!fs.existsSync(quizHistoryFile)) {
  fs.writeFileSync(quizHistoryFile, "[]", "utf8");
}

function recordQuizCompletion(score, total, topic) {
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(quizHistoryFile, "utf8"));
  } catch {
    history = [];
  }

  history.push({
    topic,
    score,
    total,
    completedAt: new Date().toISOString()
  });

  fs.writeFileSync(
    quizHistoryFile,
    JSON.stringify(history, null, 2),
    "utf8"
  );
}

// ===============================
// QUIZ SESSION
// ===============================

let quizSession = null;

// ===============================
// SAFE PATH
// ===============================

function getSafePath(relativePath = "") {
  const targetPath = path.resolve(universityFolder, relativePath);

  if (
    targetPath !== universityFolder &&
    !targetPath.startsWith(universityFolder + path.sep)
  ) {
    throw new Error("Access denied.");
  }

  return targetPath;
}

// ===============================
// LIST FILES
// ===============================

function listFiles(relativePath = "") {
  const targetPath = getSafePath(relativePath);

  if (!fs.existsSync(targetPath)) {
    throw new Error("Path does not exist.");
  }

  const items = fs.readdirSync(targetPath, {
    withFileTypes: true,
  });

  return items.map((item) => ({
    name: item.name,
    type: item.isDirectory() ? "folder" : "file",
    path: path.join(relativePath, item.name),
  }));
}

// ===============================
// SEARCH FILES
// ===============================

function searchFiles(relativePath = "", searchTerm = "") {
  const targetPath = getSafePath(relativePath);

  if (!fs.existsSync(targetPath)) {
    throw new Error("Path does not exist.");
  }

  const results = [];

  function search(currentPath, currentRelativePath) {
    const items = fs.readdirSync(currentPath, {
      withFileTypes: true,
    });

    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);
      const relativeItemPath = path.join(
        currentRelativePath,
        item.name
      );

      if (item.isDirectory()) {
        search(fullPath, relativeItemPath);
      } else {
        if (
          item.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ) {
          results.push({
            name: item.name,
            path: relativeItemPath,
          });
        }
      }
    }
  }

  search(targetPath, relativePath);

  return results;
}

// ===============================
// READ PDF
// ===============================

async function readPDF(filePath) {
  const buffer = fs.readFileSync(filePath);

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

// ===============================
// READ WORD
// ===============================

async function readWord(filePath) {
  const result = await mammoth.extractRawText({
    path: filePath,
  });

  return result.value;
}

// ===============================
// READ POWERPOINT
// ===============================

async function readPowerPoint(filePath) {
  const text = await pptxTextParser(filePath, "text");

  return text;
}

// ===============================
// READ EXCEL
// ===============================

function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);

  let text = "";

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    text += `\n--- Sheet: ${sheetName} ---\n`;

    text += XLSX.utils.sheet_to_csv(sheet);
  }

  return text;
}

// ===============================
// READ FILE
// ===============================

async function readFile(relativePath) {
  const filePath = getSafePath(relativePath);

  if (!fs.existsSync(filePath)) {
    throw new Error("File does not exist.");
  }

  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".pdf":
      return await readPDF(filePath);

    case ".docx":
      return await readWord(filePath);

    case ".pptx":
      return await readPowerPoint(filePath);

    case ".xlsx":
    case ".xls":
      return readExcel(filePath);

    case ".txt":
    case ".md":
    case ".csv":
    case ".json":
      return fs.readFileSync(filePath, "utf8");

    default:
      throw new Error(
        `Unsupported file type: ${extension}`
      );
  }
}

// ===============================
// START QUIZ
// ===============================

function startQuiz(topic) {
  quizSession = {
    topic,
    questions: [],
    currentQuestion: 0,
    score: 0,
    started: true,
  };

  return {
    success: true,
    message: `Quiz started for: ${topic}`,
    number_of_questions: 5,
  };
}

// ===============================
// SAVE QUIZ QUESTIONS
// ===============================

function saveQuiz(questions) {
  if (!quizSession) {
    throw new Error("No quiz has been started.");
  }

  if (!Array.isArray(questions)) {
    throw new Error("Questions must be an array.");
  }

  if (questions.length !== 5) {
    throw new Error("Quiz must contain exactly 5 questions.");
  }

  quizSession.questions = questions.map((q) => ({
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer.toUpperCase(),
    explanation: q.explanation || "",
  }));

  quizSession.currentQuestion = 0;
  quizSession.score = 0;

  return {
    success: true,
    message: "Quiz questions saved successfully.",
    total_questions: 5,
  };
}

// ===============================
// GET CURRENT QUESTION
// ===============================

function getCurrentQuestion() {
  if (!quizSession) {
    throw new Error("No active quiz.");
  }

  if (!quizSession.questions.length) {
    throw new Error("Quiz questions have not been generated yet.");
  }

  if (
    quizSession.currentQuestion >=
    quizSession.questions.length
  ) {
    return {
      finished: true,
      score: quizSession.score,
      total: quizSession.questions.length,
    };
  }

  const q =
    quizSession.questions[quizSession.currentQuestion];

  return {
    question_number: quizSession.currentQuestion + 1,
    total_questions: quizSession.questions.length,
    question: q.question,
    options: q.options,
  };
}

// ===============================
// ANSWER QUIZ
// ===============================

function answerQuiz(answer) {
  if (!quizSession) {
    throw new Error("No active quiz.");
  }

  if (!quizSession.questions.length) {
    throw new Error("Quiz questions are not ready.");
  }

  if (
    quizSession.currentQuestion >=
    quizSession.questions.length
  ) {
    return {
      finished: true,
      score: quizSession.score,
      total: quizSession.questions.length,
    };
  }

  const userAnswer = String(answer)
    .trim()
    .toUpperCase();

  const currentQuestion =
    quizSession.questions[quizSession.currentQuestion];

  const correct =
    userAnswer === currentQuestion.correct_answer;

  if (correct) {
    quizSession.score++;
  }

  const questionNumber =
    quizSession.currentQuestion + 1;

  quizSession.currentQuestion++;

  const finished =
    quizSession.currentQuestion >=
    quizSession.questions.length;

  if (finished) {
    recordQuizCompletion(
      quizSession.score,
      quizSession.questions.length,
      quizSession.topic
    );
  }

  return {
    correct,
    user_answer: userAnswer,
    correct_answer: currentQuestion.correct_answer,
    explanation: currentQuestion.explanation,
    question_number: questionNumber,
    score: quizSession.score,
    finished,
    total_questions: quizSession.questions.length,
  };
}

// ===============================
// TOOLS
// ===============================

const tools = [
  {
    type: "function",
    name: "list_files",
    description:
      "List files and folders inside the university folder. Read-only.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path inside the university folder.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "search_files",
    description:
      "Search recursively for files inside the university folder. Read-only.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative folder path inside university.",
        },
        search_term: {
          type: "string",
          description:
            "File name or keyword to search for.",
        },
      },
      required: ["path", "search_term"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "read_file",
    description:
      "Read a file from the university folder. Supports PDF, DOCX, PPTX, XLSX, XLS, TXT, MD, CSV and JSON.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative file path inside university.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "start_quiz",
    description:
      "Start a new interactive quiz. Every quiz MUST contain exactly 5 multiple-choice questions.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "The study topic for the quiz.",
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "save_quiz",
    description:
      "Save exactly 5 generated multiple-choice questions into the active quiz.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              question: {
                type: "string",
              },
              options: {
                type: "object",
                properties: {
                  A: {
                    type: "string",
                  },
                  B: {
                    type: "string",
                  },
                  C: {
                    type: "string",
                  },
                  D: {
                    type: "string",
                  },
                },
                required: ["A", "B", "C", "D"],
                additionalProperties: false,
              },
              correct_answer: {
                type: "string",
                enum: ["A", "B", "C", "D"],
              },
              explanation: {
                type: "string",
              },
            },
            required: [
              "question",
              "options",
              "correct_answer",
              "explanation",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "get_current_question",
    description:
      "Get the current question of the active quiz.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },

  {
    type: "function",
    name: "answer_quiz",
    description:
      "Check the user's answer to the current quiz question.",
    parameters: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          enum: ["A", "B", "C", "D"],
          description:
            "The user's selected answer.",
        },
      },
      required: ["answer"],
      additionalProperties: false,
    },
  },
];

// ===============================
// TOOL EXECUTION
// ===============================

async function executeTool(name, args) {
  switch (name) {
    case "list_files":
      return listFiles(args.path);

    case "search_files":
      return searchFiles(
        args.path,
        args.search_term
      );

    case "read_file":
      return await readFile(args.path);

    case "start_quiz":
      return startQuiz(args.topic);

    case "save_quiz":
      return saveQuiz(args.questions);

    case "get_current_question":
      return getCurrentQuestion();

    case "answer_quiz":
      return answerQuiz(args.answer);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ===============================
// AI AGENT
// ===============================

const instructions = `
You are a university study AI agent.

Your job is to help the student study using ONLY the files
inside the local "university" folder when the user asks
about their university materials.

You have READ-ONLY access.

You can:
- list files
- search recursively through folders
- read PDF files
- read Word DOCX files
- read PowerPoint PPTX files
- read Excel XLS/XLSX files
- read TXT, MD, CSV and JSON files
- summarize study material
- create interactive quizzes

IMPORTANT:
Never modify, delete, create, rename or execute files
inside the university folder.

QUIZ RULES:

When the user asks for a quiz:

1. Call start_quiz.
2. Search and read the relevant study material if necessary.
3. Generate exactly 5 multiple-choice questions.
4. Questions should be based on the study material.
5. Each question must have A, B, C and D.
6. There must be exactly one correct answer.
7. Call save_quiz with the 5 questions.
8. Call get_current_question.
9. Show ONLY the current question and its four options.
10. Wait for the user's answer.
11. When the user answers A/B/C/D, call answer_quiz.
12. Tell the user whether the answer is correct or incorrect.
13. Show the correct answer and a short explanation.
14. If the quiz is not finished, call get_current_question and show the next question.
15. After question 5, show the final score out of 5.

Do NOT reveal the correct answer before the student answers.

If the user answers with words like:
"الأول", "الثاني", "الثالث", "الرابع"
interpret them as A, B, C, D respectively when possible.

Keep explanations simple and useful for a student.
`;

// ===============================
// RUN AGENT
// ===============================

async function runAgent(userMessage, history = []) {
  let input = [];

  if (Array.isArray(history) && history.length > 0) {
    input.push({
      role: "developer",
      content:
        "Previous conversation context. Use it only to understand the current request and continue naturally."
    });

    for (const item of history.slice(-20)) {
      if (
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      ) {
        input.push({
          role: item.role,
          content: item.content
        });
      }
    }
  }

  input.push({
    role: "user",
    content: userMessage,
  });

  while (true) {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions,
      tools,
      input,
    });

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call"
    );

    if (functionCalls.length === 0) {
      return response.output_text;
    }

    input.push(...response.output);

    for (const call of functionCalls) {
      try {
        const args = JSON.parse(call.arguments);

        const result = await executeTool(
          call.name,
          args
        );

        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      } catch (error) {
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            error: error.message,
          }),
        });
      }
    }
  }
}

// ===============================
// TERMINAL CHAT
// ===============================

// ===============================
// EXPORT FOR WEB SERVER
// ===============================

module.exports = {
  runAgent,
};

// ===============================
// TERMINAL CHAT
// ===============================

if (require.main === module) {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("=================================");
  console.log("      AI STUDY AGENT");
  console.log("=================================");
  console.log("Type 'exit' to quit.");
  console.log("");

  function askUser() {
    rl.question("You: ", async (message) => {

      if (message.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const answer = await runAgent(message);

        console.log("\nAgent:", answer);
        console.log("");

      } catch (error) {
        console.error("\nError:", error.message);
        console.log("");
      }

      askUser();
    });
  }

  askUser();
}