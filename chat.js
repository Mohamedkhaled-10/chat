const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");

if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

let replyData = null; // لتخزين بيانات الرسالة المُراد الرد عليها

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

  // لو فيه رد
  if (data.replyTo) {
    content += `
      <div class="reply-box">
        <strong>${data.replyTo.sender}:</strong> ${data.replyTo.text.slice(0, 50)}
      </div>`;
  }

  content += `<strong>${data.sender}:</strong> ${data.text}`;
  content += `<br><small>${new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;

  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${snapshot.key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  msgDiv.innerHTML = content;

  // فعل السحب للرد
  enableSwipeToReply(msgDiv, data);

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// حذف الرسالة
function deleteMessage(key) {
  if (confirm("هل تريد حذف هذه الرسالة؟")) {
    db.ref("messages/" + key).remove();
  }
}

// عرض مربع الرد
function showReplyBox(name, text) {
  removeReplyBox();

  const replyDiv = document.createElement("div");
  replyDiv.id = "replyBox";
  replyDiv.style = "padding: 8px 12px; background:#222; border-right:4px solid #00d0ff; margin-bottom:10px; font-size:14px; border-radius:6px;";
  replyDiv.innerHTML = `<strong>رداً على ${name}:</strong> ${text} 
    <span onclick="removeReplyBox()" style="float:left; cursor:pointer; color:#f55;"><i class="fas fa-times"></i></span>`;

  input.parentNode.insertBefore(replyDiv, input);
}

// إزالة مربع الرد
function removeReplyBox() {
  const existing = document.getElementById("replyBox");
  if (existing) existing.remove();
  replyData = null;
}

// وظيفة السحب لليمين للرد
function enableSwipeToReply(element, data) {
  let startX = 0;

  element.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  });

  element.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    const distance = endX - startX;

    if (distance > 60) {
      replyData = {
        sender: data.sender,
        text: data.text
      };
      showReplyBox(data.sender, data.text);
    }
  });
}
