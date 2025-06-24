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
  replyData = null;
  removeReplyBox();
  input.focus(); // عدم إغلاق الكيبورد
}

// استقبال الرسائل
db.ref("messages").on("child_added", snapshot => {
  const data = snapshot.val();
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  if (data.sender === username) msgDiv.classList.add("me");

  msgDiv.dataset.key = snapshot.key; // مهم لحذف الرسالة لاحقًا

  let content = "";

  // لو فيه رد على رسالة
  if (data.replyTo) {
    content += `
      <div class="reply-box">
        <strong>${data.replyTo.sender}:</strong>
        <div style="font-size:13px; color:#bbb;">${data.replyTo.text.slice(0, 60)}</div>
      </div>`;
  }

  content += `<strong>${data.sender}:</strong> ${data.text}`;
  content += `<br><small>${new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;

  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${snapshot.key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  msgDiv.innerHTML = content;

  // تفعيل السحب للرد
  enableSwipeToReply(msgDiv, data);

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// حذف الرسالة من قاعدة البيانات
function deleteMessage(key) {
  if (confirm("هل تريد حذف هذه الرسالة؟")) {
    db.ref("messages/" + key).remove();
  }
}

// عند حذف رسالة من القاعدة → احذفها من الواجهة فورًا عند الجميع
db.ref("messages").on("child_removed", snapshot => {
  const deletedKey = snapshot.key;
  const allMessages = chatBox.querySelectorAll('.message');

  allMessages.forEach(el => {
    if (el.dataset.key === deletedKey) {
      el.remove();
    }
  });
});

// عرض مربع الرد
function showReplyBox(name, text) {
  removeReplyBox();

  const replyDiv = document.createElement("div");
  replyDiv.id = "replyBox";
  replyDiv.innerHTML = `
    <strong>رداً على ${name}:</strong> ${text}
    <span onclick="removeReplyBox()" style="float:left; cursor:pointer; color:#f55;"><i class="fas fa-times"></i></span>
  `;
  replyDiv.style = `
    padding: 8px 12px;
    background: #222;
    border-right: 4px solid #00d0ff;
    margin-bottom: 10px;
    font-size: 14px;
    border-radius: 6px;
    color: #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  input.parentNode.insertBefore(replyDiv, input);
}

// إزالة مربع الرد
function removeReplyBox() {
  const existing = document.getElementById("replyBox");
  if (existing) existing.remove();
  replyData = null;
}

// تفعيل السحب لليمين للرد (زي واتساب)
function enableSwipeToReply(element, data) {
  let startX = 0;
  let moved = false;

  element.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    element.style.transition = 'none';
  });

  element.addEventListener('touchmove', e => {
    const deltaX = e.touches[0].clientX - startX;
    if (deltaX > 0) {
      element.style.transform = `translateX(${deltaX}px)`;
      moved = true;
    }
  });

  element.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].clientX - startX;

    if (deltaX > 70 && moved) {
      replyData = {
        sender: data.sender,
        text: data.text
      };
      showReplyBox(data.sender, data.text);
    }

    element.style.transition = 'transform 0.3s ease';
    element.style.transform = 'translateX(0)';
    moved = false;
  });
}
