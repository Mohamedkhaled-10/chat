function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) return alert("يرجى إدخال البيانات كاملة");

  const usersRef = db.ref("users");

  usersRef.child(username).once("value", snapshot => {
    if (snapshot.exists()) {
      alert("هذا الاسم موجود بالفعل!");
    } else {
      usersRef.child(username).set({ password });
      alert("تم التسجيل بنجاح!");
      window.location.href = "index.html";
    }
  });
}
