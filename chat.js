const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const mediaInput = document.getElementById("mediaInput");
mediaInput.addEventListener("change", uploadMedia);

// التحقق من تسجيل الدخول
if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

let replyData = null;

function sendMessage() {
  const msg = input.value.trim();
  if (msg === '') return;

  db.ref("messages").push({
    id: Date.now(),
    sender: username,
    text: msg,
    time: Date.now(),
    replyTo: replyData || null,
    media: null,
    reactions: {}
  });

  input.value = '';
  replyData = null;
  removeReplyBox();
  input.focus();
}

function uploadSpecificMedia(type) {
  mediaInput.accept = type;
  mediaInput.click();
}

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
        type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file',
        url: mediaURL,
        name: file.name
      },
      reactions: {}
    });

    input.value = '';
    replyData = null;
    removeReplyBox();
    input.focus();
  };
  reader.readAsDataURL(file);
}

// بقية الكود لا يحتاج تعديل لأنه يدعم عرض الميديا بشكل صحيح (تم التعديل في uploadMedia فقط)

// تابع الكود من الرسائل والتفاعلات والردود كما هو بدون تغيير (نفس ما أرسلته أنت)


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

  content += `<div class="sender-name">${data.sender}</div>`;

  if (data.media) {
    if (data.media.type === 'image') {
      content += `<div class="media"><img src="${data.media.url}" alt="صورة" onclick="openFullScreenMedia('${data.media.url}')"></div>`;
    } else if (data.media.type === 'video') {
      content += `<div class="media"><video controls src="${data.media.url}" onclick="event.stopPropagation()"></video></div>`;
    } else {
      content += `<div class="media"><a href="${data.media.url}" download target="_blank" style="color:#00d0ff;">📄 ${data.media.name || 'تحميل ملف'}</a></div>`;
    }
  } else {
    const msgText = (data.text || '');
    const parsedText = msgText.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" style="color:#00d0ff;">$1</a>'
    );
    content += `<div class="message-text">${parsedText}</div>`;

    const urlMatch = msgText.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const url = urlMatch[0];
      fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(meta => {
          const preview = document.createElement("div");
          preview.className = "link-preview";
          preview.style = "border:1px solid #ccc; border-radius:8px; margin-top:5px; padding:10px; background:#111;";

          preview.innerHTML = `
            ${meta.image ? `<img src="${meta.image}" style="max-width:100%; border-radius:6px;">` : ''}
            <div style="font-weight:bold; margin-top:5px;">${meta.title || url}</div>
            <div style="font-size:13px; color:#aaa;">${meta.description || ''}</div>
          `;

          msgDiv.appendChild(preview);
        })
        .catch(err => console.log("❌ معاينة الرابط فشلت:", err));
    }
  }

  content += `<br><small>${new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;

  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  if (data.reactions) {
    const reactionCounts = {};
    for (const user in data.reactions) {
      const emoji = data.reactions[user];
      if (!reactionCounts[emoji]) reactionCounts[emoji] = 0;
      reactionCounts[emoji]++;
    }
    const reactionsHTML = Object.entries(reactionCounts).map(([emoji, count]) => `<span>${emoji} ${count}</span>`).join(' ');
    content += `<div class="reactions">${reactionsHTML}</div>`;
  }

  msgDiv.innerHTML += content;

  msgDiv.addEventListener("contextmenu", e => e.preventDefault());
  msgDiv.addEventListener("touchstart", e => {
    msgDiv.longPressTimer = setTimeout(() => showReactionPopup(msgDiv, key), 500);
  });
  msgDiv.addEventListener("touchend", e => {
    clearTimeout(msgDiv.longPressTimer);
  });
  msgDiv.addEventListener("mousedown", e => {
    msgDiv.longPressTimer = setTimeout(() => showReactionPopup(msgDiv, key), 600);
  });
  msgDiv.addEventListener("mouseup", e => {
    clearTimeout(msgDiv.longPressTimer);
  });

  enableSwipeToReply(msgDiv, data);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}


function showReactionPopup(element, key) {
  const existing = document.querySelector(".reaction-popup");
  if (existing) existing.remove();

  const rect = element.getBoundingClientRect();

  const popup = document.createElement("div");
  popup.className = "reaction-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = 1000;
  popup.style.top = (rect.top - 45) + "px";
  popup.style.left = (rect.left + rect.width / 2 - 100) + "px";
  popup.style.background = "#222";
  popup.style.borderRadius = "20px";
  popup.style.padding = "6px 12px";
  popup.style.display = "flex";
  popup.style.gap = "12px";
  popup.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";

  ["😂", "❤️", "👍", "😮", "😢", "😡"].forEach(emoji => {
    const btn = document.createElement("span");
    btn.textContent = emoji;
    btn.style.cursor = "pointer";
    btn.style.fontSize = "20px";
    btn.onclick = () => {
      addReaction(key, emoji);
      popup.remove();
    };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  setTimeout(() => {
    document.addEventListener("click", () => popup.remove(), { once: true });
  }, 0);
}

function addReaction(msgKey, emoji) {
  const userReactionRef = db.ref(`messages/${msgKey}/reactions/${username}`);
  userReactionRef.set(emoji);
}

db.ref("messages").on("child_added", snapshot => {
  renderMessage(snapshot.val(), snapshot.key);
});

db.ref("messages").on("child_changed", snapshot => {
  const msgEl = chatBox.querySelector(`[data-key='${snapshot.key}']`);
  if (msgEl) msgEl.remove();
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(registration => {
      console.log("✅ Service Worker تم تسجيله:", registration);
    })
    .catch(err => {
      console.error("❌ فشل تسجيل Service Worker:", err);
    });
}

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

  messaging.onMessage(payload => {
    const { title, body } = payload.notification;
    new Notification(title, {
      body,
      icon: "/icon.png"
    });
  });
}

function toggleMediaMenu() {
  const menu = document.querySelector('.media-menu');
  if (menu.classList.contains('show')) {
    menu.classList.remove('show');
  } else {
    menu.style.bottom = '55px';
    menu.classList.add('show');
  }
}

window.addEventListener('click', (e) => {
  const menu = document.querySelector('.media-menu');
  const button = document.querySelector('.media-btn');
  if (menu && !menu.contains(e.target) && !button.contains(e.target)) {
    menu.classList.remove('show');
  }
});
