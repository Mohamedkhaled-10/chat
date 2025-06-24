const username = localStorage.getItem("username");
const chatBox = document.getElementById("chat-box");
const input = document.getElementById("message-input");

if (!username) {
  alert("يرجى تسجيل الدخول أولاً");
  window.location.href = "index.html";
}

document.getElementById("userDisplay").textContent = username;

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

db.ref("messages").on("child_added", snapshot => {
  const data = snapshot.val();
  const msg = document.createElement("div");
  msg.innerHTML = `<strong>${data.sender}:</strong> ${data.text}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
});
