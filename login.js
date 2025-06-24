function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  db.ref("users/" + username).once("value", snapshot => {
    if (!snapshot.exists()) {
      alert("المستخدم غير موجود");
    } else if (snapshot.val().password !== password) {
      alert("كلمة المرور خاطئة");
    } else {
      localStorage.setItem("username", username);
      window.location.href = "chat.html";
    }
  });
}
