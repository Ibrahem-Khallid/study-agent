const chat = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

let currentConversationId =
    localStorage.getItem("studyAgentConversationId") || "";
let conversationHistory = [];

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
}

function showWelcome() {
    chat.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">🎓</div>
            <h2>أهلًا بك في Study Agent 👋</h2>
            <p>أقدر أبحث في ملفاتك الجامعية، أشرح لك المواد، ألخصها، وأسوي لك اختبارات تفاعلية.</p>
            <div class="quick-actions">
                <button onclick="quickMessage('ابحث عن مشروع هندسة المتطلبات واشرحه لي')">🔍 ابحث في ملفاتي</button>
                <button onclick="quickMessage('لخص لي مشروع هندسة المتطلبات')">📝 لخص لي</button>
                <button onclick="quickMessage('سو لي اختبار تفاعلي من 5 أسئلة عن هندسة المتطلبات')">🧠 ابدأ اختبار</button>
            </div>
        </div>`;
}

window.sendMessage = async function () {
    const message = messageInput.value.trim();
    if (!message) return;

    addMessage(message, "user");
    messageInput.value = "";
    sendButton.disabled = true;
    sendButton.textContent = "جاري التفكير...";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                conversationId: currentConversationId,
                history: conversationHistory
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "حدث خطأ.");

        currentConversationId = data.conversationId;
        localStorage.setItem("studyAgentConversationId", currentConversationId);

        addMessage(data.answer, "agent");

        conversationHistory.push(
            { role: "user", content: message },
            { role: "assistant", content: data.answer }
        );

        await loadConversations();
    } catch (error) {
        addMessage("تعذر تنفيذ الطلب: " + error.message, "agent");
    }

    sendButton.disabled = false;
    sendButton.textContent = "إرسال";
    messageInput.focus();
};

window.quickMessage = function (text) {
    messageInput.value = text;
    sendMessage();
};

window.newChat = function () {
    currentConversationId = "";
    conversationHistory = [];
    localStorage.removeItem("studyAgentConversationId");
    showWelcome();
    document.getElementById("pageTitle").textContent = "Study Agent";
    document.getElementById("pageSubtitle").textContent =
        "مساعدك الذكي للدراسة والبحث في ملفاتك";
    loadConversations();
    messageInput.focus();
};

async function loadConversations() {
    const list = document.getElementById("conversationList");
    try {
        const response = await fetch("/api/conversations");
        const conversations = await response.json();
        list.innerHTML = "";

        conversations.slice(0, 15).forEach((conversation) => {
            const item = document.createElement("div");
            item.className =
                "conversation-item" +
                (conversation.id === currentConversationId ? " active" : "");

            item.innerHTML = `
                <button class="conversation-open">💬 ${escapeHtml(conversation.title)}</button>
                <button class="conversation-delete" title="حذف">×</button>`;

            item.querySelector(".conversation-open").onclick = () =>
                loadConversation(conversation.id);

            item.querySelector(".conversation-delete").onclick = (event) => {
                event.stopPropagation();
                deleteConversation(conversation.id);
            };

            list.appendChild(item);
        });
    } catch (error) {
        console.error(error);
    }
}

async function loadConversation(id) {
    try {
        const response = await fetch(`/api/conversations/${id}`);
        const conversation = await response.json();
        if (!response.ok) throw new Error(conversation.error);

        currentConversationId = conversation.id;
        localStorage.setItem("studyAgentConversationId", currentConversationId);

        conversationHistory = conversation.messages.map((m) => ({
            role: m.role,
            content: m.content
        }));

        chat.innerHTML = "";
        conversation.messages.forEach((m) =>
            addMessage(m.content, m.role === "user" ? "user" : "agent")
        );

        document.getElementById("pageTitle").textContent = conversation.title;
        document.getElementById("pageSubtitle").textContent = "محادثة محفوظة";
        await loadConversations();
    } catch (error) {
        console.error(error);
    }
}

async function deleteConversation(id) {
    if (!confirm("هل تريد حذف هذه المحادثة؟")) return;

    await fetch(`/api/conversations/${id}`, { method: "DELETE" });

    if (id === currentConversationId) newChat();
    await loadConversations();
}

window.showDashboard = async function () {
    document.getElementById("dashboardModal").classList.remove("hidden");
    await refreshDashboard();
};

window.closeDashboard = function () {
    document.getElementById("dashboardModal").classList.add("hidden");
};

async function refreshDashboard() {
    try {
        const response = await fetch("/api/dashboard");
        const stats = await response.json();

        document.getElementById("statFiles").textContent = stats.files;
        document.getElementById("statConversations").textContent = stats.conversations;
        document.getElementById("statMessages").textContent = stats.messages;
        document.getElementById("statQuizzes").textContent = stats.quizzes;
    } catch (error) {
        console.error(error);
    }
}

window.openUpload = function () {
    document.getElementById("uploadModal").classList.remove("hidden");
    document.getElementById("uploadStatus").textContent = "";
    document.getElementById("selectedFile").textContent = "";
};

window.closeUpload = function () {
    document.getElementById("uploadModal").classList.add("hidden");
};

document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];
    document.getElementById("selectedFile").textContent =
        file ? `📄 ${file.name}` : "";
});

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

window.uploadFile = async function () {
    const fileInput = document.getElementById("fileInput");
    const uploadButton = document.getElementById("uploadButton");
    const status = document.getElementById("uploadStatus");
    const file = fileInput.files[0];

    if (!file) {
        status.textContent = "اختر ملفًا أولًا.";
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "جاري الرفع...";
    status.textContent = "";

    try {
        const fileData = await fileToBase64(file);

        const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                fileData
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "فشل رفع الملف.");

        status.textContent = `✅ تم رفع ${data.fileName} بنجاح.`;
        fileInput.value = "";
        document.getElementById("selectedFile").textContent = "";
    } catch (error) {
        status.textContent = "❌ " + error.message;
    }

    uploadButton.disabled = false;
    uploadButton.textContent = "رفع الملف";
};

document.getElementById("dashboardModal").onclick = (e) => {
    if (e.target.id === "dashboardModal") closeDashboard();
};

document.getElementById("uploadModal").onclick = (e) => {
    if (e.target.id === "uploadModal") closeUpload();
};

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
});

loadConversations();
