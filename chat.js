const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const mediaInput = document.getElementById("mediaInput");

// التحقق من تسجيل الدخول
if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

let replyData = null;

// إرسال رسالة نصية
function sendMessage() {
  const msg = input.value.trim();
  if (msg === '') return;

  db.ref("messages").push({
    id: Date.now(),
    sender: username,
    text: msg,
    time: Date.now(),
    replyTo: replyData || null,
    media: null
  });

  input.value = '';
  replyData = null;
  removeReplyBox();
  input.focus();
}

// إرسال ميديا (صورة / فيديو)
function uploadMedia(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const mediaURL = e.target.result;
    db.ref("messages").push({
      id: Date.now(),
      sender: username,
      text: '',
      time: Date.now(),
      replyTo: replyData || null,
      media: {
        type: file.type.startsWith('image') ? 'image' : 'video',
        url: mediaURL
      }
    });
    replyData = null;
    removeReplyBox();
  };
  reader.readAsDataURL(file);
}

// عرض الرسائل
function renderMessage(data, key) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  if (data.sender === username) msgDiv.classList.add("me");
  msgDiv.dataset.key = key;

  let content = "";

  if (data.replyTo) {
    content += `
      <div class="reply-box">
        <strong>${data.replyTo.sender}:</strong>
        <div style="font-size:13px; color:#bbb;">${(data.replyTo.text || '').slice(0, 60)}</div>
      </div>`;
  }

  content += `<strong>${data.sender}:</strong> `;

  if (data.media) {
    if (data.media.type === 'image') {
      content += `<div class="media"><img src="${data.media.url}" alt="صورة" onclick="openFullScreenMedia('${data.media.url}')"></div>`;
    } else if (data.media.type === 'video') {
      content += `<div class="media"><video controls src="${data.media.url}" onclick="event.stopPropagation()"></video></div>`;
    }
  } else {
    content += `${data.text}`;
  }

  content += `<br><small>${new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;

  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  msgDiv.innerHTML = content;
  enableSwipeToReply(msgDiv, data);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

db.ref("messages").on("child_added", snapshot => {
  renderMessage(snapshot.val(), snapshot.key);
});

db.ref("messages").on("child_removed", snapshot => {
  const deletedKey = snapshot.key;
  const allMessages = chatBox.querySelectorAll('.message');
  allMessages.forEach(el => {
    if (el.dataset.key === deletedKey) {
      el.remove();
    }
  });
});

function deleteMessage(key) {
  if (confirm("هل تريد حذف هذه الرسالة؟")) {
    db.ref("messages/" + key).remove();
  }
}

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

function removeReplyBox() {
  const existing = document.getElementById("replyBox");
  if (existing) existing.remove();
  replyData = null;
}

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
        text: data.text || '[ميديا]'
      };
      showReplyBox(data.sender, data.text || '[ميديا]');
    }
    element.style.transition = 'transform 0.3s ease';
    element.style.transform = 'translateX(0)';
    moved = false;
  });
}

function openFullScreenMedia(url) {
  const viewer = document.createElement('div');
  viewer.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  const img = document.createElement('img');
  img.src = url;
  img.style = 'max-width: 90vw; max-height: 90vh; border-radius: 10px;';
  viewer.appendChild(img);
  viewer.addEventListener('click', () => viewer.remove());
  document.body.appendChild(viewer);
}

// ✅ تسجيل Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(registration => {
      console.log("✅ Service Worker تم تسجيله:", registration);
    })
    .catch(err => {
      console.error("❌ فشل تسجيل Service Worker:", err);
    });
}

// ✅ إعداد الإشعارات باستخدام FCM
if ('Notification' in window && firebase.messaging.isSupported()) {
  const messaging = firebase.messaging();

  messaging.getToken({
    vapidKey: "BEYdjZSgrbnqsQbu2bfEE89MaEGnksqizHuTNTocbdz9FVeaZruiO0FdeDAzKLN_QYjOZ1TccWNOA_R5ZfS9U0c"
  }).then(currentToken => {
    if (currentToken) {
      db.ref("tokens/" + username).set(currentToken);
      console.log("🔐 Token:", currentToken);
    } else {
      console.warn("🔔 لم يتم منح صلاحية الإشعارات.");
    }
  }).catch(err => {
    console.error("❌ خطأ في التوكن:", err);
  });

  // استقبال الإشعارات داخل الصفحة
  messaging.onMessage(payload => {
    const { title, body } = payload.notification;
    new Notification(title, {
      body,
      icon: "/icon.png"
    });
  });
}
