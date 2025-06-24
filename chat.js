const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");

if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

let replyData = null;

// إرسال الرسالة
function sendMessage() {
  const msg = input.value.trim();
  if (msg === '') return;

  db.ref("messages").push({
    id: Date.now(),
    sender: username,
    text: msg,
    time: Date.now(),
    replyTo: replyData
  });

  input.value = '';
  input.focus(); // ✅ يمنع إغلاق الكيبورد
  replyData = null;
  removeReplyBox();
}

// استقبال الرسائل
db.ref("messages").on("child_added", snapshot => {
  const data = snapshot.val();
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  if (data.sender === username) msgDiv.classList.add("me");

  let content = '';

  // ✅ عرض مربع الرد إن وجد
  if (data.replyTo) {
    content += `
      <div class="reply-box">
        <strong>${data.replyTo.sender}:</strong> ${data.replyTo.text}
      </div>`;
  }

  // ✅ نص الرسالة والوقت
  content += `<strong>${data.sender}:</strong> ${data.text}`;
  content += `<br><small>${new Date(data.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</small>`;

  // ✅ زر الحذف لو الرسالة بتاعتي
  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${snapshot.key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  msgDiv.innerHTML = content;

  // ✅ الرد على رسالة عند الضغط
  msgDiv.onclick = () => {
    replyData = {
      sender: data.sender,
      text: data.text
    };
    showReplyBox(data.sender, data.text);
  };

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// حذف الرسالة
function deleteMessage(key) {
  if (confirm("هل تريد حذف هذه الرسالة؟")) {
    db.ref("messages/" + key).remove();
  }
}

// عرض مربع الرد فوق حقل الكتابة
function showReplyBox(name, text) {
  removeReplyBox();

  const replyDiv = document.createElement("div");
  replyDiv.id = "replyBox";
  replyDiv.className = "reply-box";
  replyDiv.innerHTML = `
    <strong>رداً على ${name}:</strong> ${text}
    <span onclick="removeReplyBox()" style="float:left; cursor:pointer; color:#f55;"><i class="fas fa-times"></i></span>
  `;

  input.parentNode.insertBefore(replyDiv, input);
}

// إخفاء مربع الرد
function removeReplyBox() {
  const existing = document.getElementById("replyBox");
  if (existing) existing.remove();
  replyData = null;
}
