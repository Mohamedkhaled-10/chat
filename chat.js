const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");
const mediaInput = document.getElementById("mediaInput");
let typingTimeout;

// التحقق من تسجيل الدخول
if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

// مؤشر الكتابة
input.addEventListener("input", () => {
  db.ref("typing/" + username).set(true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    db.ref("typing/" + username).remove();
  }, 3000);

  // التعرف على @ لإظهار قائمة المنشن
  const cursorPos = input.selectionStart;
  const textBefore = input.value.slice(0, cursorPos);
  const atMatch = textBefore.match(/@([\w]*)$/);
  if (atMatch) {
    const prefix = atMatch[1].toLowerCase();
    showMentionDropdown(prefix);
  } else {
    hideMentionDropdown();
  }
});

window.addEventListener("beforeunload", () => {
  db.ref("typing/" + username).remove();
});

// عنصر قائمة المنشن
function createDropdown() {
  const dd = document.createElement('div');
  dd.id = 'mentionDropdown';
  dd.style = 'position:absolute; background:#333; color:#fff; border-radius:4px; max-height:150px; overflow:auto;';
  input.parentNode.appendChild(dd);
  return dd;
}
function hideMentionDropdown() {
  const dd = document.getElementById('mentionDropdown');
  if (dd) dd.innerHTML = '';
}
function showMentionDropdown(prefix) {
  db.ref('users').orderByChild('username')
    .startAt(prefix).endAt(prefix + "\uf8ff")
    .once('value', snap => {
      const users = [];
      snap.forEach(child => users.push(child.val().username));
      renderDropdown(users);
    });
}
function renderDropdown(users) {
  const dd = document.getElementById('mentionDropdown') || createDropdown();
  dd.style.top = input.offsetTop + input.offsetHeight + 'px';
  dd.style.left = input.offsetLeft + 'px';
  dd.innerHTML = users.map(u => `<div class="item" style="padding:4px;cursor:pointer;">${u}</div>`).join('');
  dd.querySelectorAll('.item').forEach(item => {
    item.onclick = () => selectMention(item.textContent);
  });
}
function selectMention(user) {
  const cursorPos = input.selectionStart;
  const text = input.value;
  const newText = text.replace(/@[\w]*$/, `@${user} `);
  input.value = newText;
  input.focus();
  hideMentionDropdown();
}

// رفع الميديا
mediaInput.addEventListener("change", uploadMedia);

let replyData = null;

function sendMessage() {
  const msg = input.value.trim();
  if (msg === '') return;

  // استخراج المنشنز
  const mentions = [...msg.matchAll(/@([\w]+)/g)].map(m => m[1]);

  const msgData = {
    id: Date.now(),
    sender: username,
    text: msg,
    time: Date.now(),
    replyTo: replyData || null,
    media: null,
    reactions: {},
    mentions: mentions
  };

  const newKey = db.ref("messages").push().key;
  db.ref("messages/" + newKey).set(msgData);

  // إشعارات المنشن
  mentions.forEach(user => {
    db.ref(`notifications/${user}`).push({
      from: username,
      msgId: newKey,
      time: Date.now(),
      type: 'mention'
    });
  });

  input.value = '';
  replyData = null;
  removeReplyBox();
  input.focus();
  db.ref("typing/" + username).remove();
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
    // ... (كما في الكود الأصلي)
  } else {
    const msgText = data.text || '';
    // تمييز المنشن
    const withMentions = msgText.replace(/@([\w]+)/g, '<span class="mention">@$1</span>');
    const parsedText = withMentions.replace(/(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" style="color:#00d0ff;">$1</a>');
    content += `<div class="message-text">${parsedText}</div>`;
    // معاينة الرابط كما في الأصلي
  }

  content += `<br><small>${new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>`;

  if (data.sender === username) {
    content += `<i class="fas fa-trash-alt" onclick="deleteMessage('${key}')" style="float:left; margin-top:5px; color:#888; cursor:pointer;"></i>`;
  }

  if (data.reactions) {
    // ... (كما في الأصلي)
  }

  msgDiv.innerHTML += content;

  // منع السياقات الافتراضية وإضافة التفاعلات
  // ... (كما في الأصلي)

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// الإشعارات من Firebase
if ('Notification' in window) {
  db.ref(`notifications/${username}`).on('child_added', snap => {
    const note = snap.val();
    if (Notification.permission === 'granted') {
      new Notification(`@${note.from} منشنك!`, { body: 'لديك منشن جديد', tag: note.msgId });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(`@${note.from} منشنك!`, { body: 'لديك منشن جديد', tag: note.msgId });
        }
      });
    }
    // إزالة الإشعار من الداتا بيز بعد العرض
    db.ref(`notifications/${username}/${snap.key}`).remove();
  });
}

function showReactionPopup(element, key) {
  const existing = document.querySelector(".reaction-popup");
  if (existing) existing.remove();

  const rect = element.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.className = "reaction-popup";
  popup.style = `
    position: fixed;
    top: ${rect.top - 45}px;
    left: ${rect.left + rect.width/2 - 100}px;
    background: #222;
    border-radius: 20px;
    padding: 6px 12px;
    display: flex;
    gap: 12px;
    z-index: 1000;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  `;

  ["😂","❤️","👍","😮","😢","😡"].forEach(emoji => {
    const btn = document.createElement("span");
    btn.textContent = emoji;
    btn.style.cursor = "pointer";
    btn.style.fontSize = "20px";
    btn.onclick = () => { addReaction(key, emoji); popup.remove(); };
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  setTimeout(() => { document.addEventListener("click", () => popup.remove(), { once: true }); }, 0);
}

function addReaction(msgKey, emoji) {
  db.ref(`messages/${msgKey}/reactions/${username}`).set(emoji);
}

// الاستماع للتغييرات في الرسائل
db.ref("messages").on("child_added", snapshot => { renderMessage(snapshot.val(), snapshot.key); });
db.ref("messages").on("child_changed", snapshot => {
  const el = chatBox.querySelector(`[data-key='${snapshot.key}']`);
  if (el) el.remove();
  renderMessage(snapshot.val(), snapshot.key);
});
db.ref("messages").on("child_removed", snapshot => {
  chatBox.querySelectorAll('.message').forEach(el => { if(el.dataset.key === snapshot.key) el.remove(); });
});

function deleteMessage(key) {
  if(confirm("هل تريد حذف هذه الرسالة؟")) db.ref("messages/"+key).remove();
}

function showReplyBox(name, text) {
  removeReplyBox();
  const replyDiv = document.createElement("div");
  replyDiv.id = "replyBox";
  replyDiv.innerHTML = `<strong>رداً على ${name}:</strong> ${text} <span onclick="removeReplyBox()" style="float:left;cursor:pointer;color:#f55;"><i class="fas fa-times"></i></span>`;
  input.parentNode.insertBefore(replyDiv, input);
}

function removeReplyBox() {
  const ex = document.getElementById("replyBox"); if(ex) ex.remove(); replyData=null;
}

function enableSwipeToReply(el, data) {
  let startX=0,moved=false;
  el.addEventListener('touchstart', e=>{ startX=e.touches[0].clientX; el.style.transition='none'; });
  el.addEventListener('touchmove', e=>{ const dx=e.touches[0].clientX-startX; if(dx>0){ el.style.transform=`translateX(${dx}px)`; moved=true; }});
  el.addEventListener('touchend', e=>{
    const dx=e.changedTouches[0].clientX-startX;
    if(dx>70 && moved){ replyData={sender: data.sender, text: data.text||'[ميديا]'}; showReplyBox(data.sender,data.text||'[ميديا]'); }
    el.style.transition='transform 0.3s ease'; el.style.transform='translateX(0)'; moved=false;
  });
}

function openFullScreenMedia(url) {
  const viewer=document.createElement('div');
  viewer.style=`position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:1000;`;
  const img=document.createElement('img'); img.src=url; img.style='max-width:90vw;max-height:90vh;border-radius:10px;';
  viewer.appendChild(img);
  viewer.addEventListener('click',()=>viewer.remove());
  document.body.appendChild(viewer);
}

// دالة عرض/إخفاء قائمة الميديا
function toggleMediaMenu(e) {
  e.stopPropagation(); // يمنع وصول الحدث للـ document العام
  const menu=document.getElementById("mediaMenu");
  menu.classList.toggle("show");
}

// إغلاق القائمة عند الضغط خارجها فقط إذا كانت مفتوحة
document.addEventListener("click", e => {
  const menu=document.getElementById("mediaMenu");
  if(menu.classList.contains("show")){
    const btn=document.querySelector(".media-btn");
    if(!menu.contains(e.target) && !btn.contains(e.target)){
      menu.classList.remove("show");
    }
  }
});
