const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");

if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

// عرض اسم المستخدم في أعلى الغرفة
document.getElementById("userDisplay").textContent = username;

// إرسال رسالة
function sendMessage() {
  const msg = input.value.trim();
  if (msg === '') return;

  db.ref("messages").push({
    sender: username,
    text: msg,
    time: Date.now()
  });

  input.value = '';
}

// استماع للرسائل الجديدة
db.ref("messages").on("child_added", snapshot => {
  const data = snapshot.val();

  const msg = document.createElement("div");
  msg.classList.add("message");

  if (data.sender === username) {
    msg.classList.add("me");
  }

  // تنسيق الوقت (اختياري)
  const date = new Date(data.time);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msg.innerHTML = `<strong>${data.sender}</strong>: ${data.text}<br><small style="font-size: 11px; color: #aaa;">${timeString}</small>`;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// إرسال بالضغط على Enter
input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
