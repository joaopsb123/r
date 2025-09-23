// === Importar Firebase ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc,
  where, getDocs, arrayRemove, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === Configuração Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:2d17377d7f0eac770a0672",
  measurementId: "G-9Y5E5K97NS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === Google Provider ===
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  client_id: "837381193847-cp1asre7t3ubmunq600v3qkq9m7vca98.apps.googleusercontent.com",
  prompt: "select_account"
});

// === ELEMENTOS DO DOM ===
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const authForm = document.getElementById("authForm");
const toggleAuthLink = document.getElementById("toggleAuth");
const authBtn = document.getElementById("authBtn");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const logoutBtn = document.getElementById("logoutBtn");
const authMessage = document.getElementById("authMessage");

const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const profileHeader = document.getElementById("profileHeader");
const profilePhotos = document.getElementById("profilePhotos");

const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

const publicChatBtn = document.getElementById("publicChatBtn");
const dmsBtn = document.getElementById("dmsBtn");
const publicChatContainer = document.getElementById("publicChat");
const dmsContainer = document.getElementById("dms");
const publicChatBox = document.getElementById("publicChatBox");
const publicMsgForm = document.getElementById("publicMsgForm");
const publicMsgInput = document.getElementById("publicMsgInput");

const dmUserList = document.getElementById("dmUserList");
const privateChatBox = document.getElementById("privateChatBox");
const dmMsgForm = document.getElementById("dmMsgForm");
const dmMsgInput = document.getElementById("dmMsgInput");

const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const notificationList = document.getElementById("notificationList");
const closeBtn = document.querySelector(".close-btn");

let isLoginMode = true;
let currentUser = null;
let currentDMUser = null;

// === AUTENTICAÇÃO ===
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    if (isLoginMode) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      currentUser = userCredential.user;
      authMessage.style.color = "green";
      authMessage.textContent = "✅ Login bem-sucedido!";
    } else {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      currentUser = userCredential.user;

      await setDoc(doc(db, "users", currentUser.uid), {
        name: username || email.split("@")[0],
        email: email,
        bio: "",
        profilePicUrl: null,
        following: [],
        followers: []
      });

      authMessage.style.color = "green";
      authMessage.textContent = "🎉 Conta criada com sucesso!";
    }
  } catch (error) {
    console.error("Erro de autenticação:", error);
    authMessage.style.color = "red";
    authMessage.textContent = "⚠️ " + error.message;
  }
});

// Alternar login/registro
toggleAuthLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;

  if (isLoginMode) {
    usernameInput.style.display = "none";
    authBtn.textContent = "Entrar";
    toggleAuthLink.textContent = "Criar conta";
  } else {
    usernameInput.style.display = "block";
    authBtn.textContent = "Criar conta";
    toggleAuthLink.textContent = "Já tenho conta";
  }
});

// Google login
googleAuthBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        bio: "",
        profilePicUrl: user.photoURL,
        following: [],
        followers: []
      });
    }

    authMessage.style.color = "green";
    authMessage.textContent = "✅ Login com Google feito!";
  } catch (err) {
    console.error("Erro Google:", err);
    authMessage.style.color = "red";
    authMessage.textContent = "⚠️ " + err.message;
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Estado do utilizador
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authSection.style.display = "none";
    appSection.style.display = "block";

    carregarFeed();
    carregarPerfil();
    carregarChatPublico();
    carregarUtilizadoresDM();
    carregarNotificacoes();
  } else {
    currentUser = null;
    authSection.style.display = "block";
    appSection.style.display = "none";
  }
});

// === FEED ===
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    caption: caption,
    createdAt: serverTimestamp()
  });
  document.getElementById("caption").value = "";
});

function carregarFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, async (snapshot) => {
    feedPosts.innerHTML = "";
    for (let docSnap of snapshot.docs) {
      const post = docSnap.data();
      const userSnap = await getDoc(doc(db, "users", post.userId));
      const user = userSnap.data();
      const div = document.createElement("div");
      div.classList.add("post");
      div.innerHTML = `
        <h4>${user?.name || "Anónimo"}</h4>
        <p>${post.caption}</p>
      `;
      feedPosts.appendChild(div);
    }
  });
}

// === PERFIL ===
async function carregarPerfil() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    profileHeader.innerHTML = `
      <h2>${data.name}</h2>
      <p>${data.bio || "Sem biografia"}</p>
    `;
  }
}

// === PESQUISA ===
searchInput.addEventListener("keyup", async () => {
  const term = searchInput.value.trim().toLowerCase();
  if (term === "") {
    results.innerHTML = "";
    return;
  }
  const q = query(collection(db, "users"), where("name", ">=", term), where("name", "<=", term + "\uf8ff"));
  const querySnap = await getDocs(q);
  results.innerHTML = "";
  querySnap.forEach((docSnap) => {
    const user = docSnap.data();
    const div = document.createElement("div");
    div.textContent = user.name;
    results.appendChild(div);
  });
});

// === CHAT PÚBLICO ===
publicChatBtn.addEventListener('click', () => {
  publicChatBtn.classList.add('active');
  dmsBtn.classList.remove('active');
  publicChatContainer.classList.add('active');
  dmsContainer.classList.remove('active');
});
dmsBtn.addEventListener('click', () => {
  dmsBtn.classList.add('active');
  publicChatBtn.classList.remove('active');
  publicChatContainer.classList.remove('active');
  dmsContainer.classList.add('active');
});

publicMsgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = publicMsgInput.value;
  if (!text) return;
  await addDoc(collection(db, "publicChat"), {
    userId: currentUser.uid,
    text: text,
    createdAt: serverTimestamp()
  });
  publicMsgInput.value = "";
});

function carregarChatPublico() {
  const q = query(collection(db, "publicChat"), orderBy("createdAt", "asc"));
  onSnapshot(q, async (snapshot) => {
    publicChatBox.innerHTML = "";
    for (let docSnap of snapshot.docs) {
      const msg = docSnap.data();
      const userSnap = await getDoc(doc(db, "users", msg.userId));
      const user = userSnap.data();
      const p = document.createElement("p");
      p.classList.add("chat-message");
      p.innerHTML = `<strong>${user?.name}:</strong> ${msg.text}`;
      publicChatBox.appendChild(p);
    }
  });
}

// === DM ===
async function carregarUtilizadoresDM() {
  const q = query(collection(db, "users"));
  onSnapshot(q, (snapshot) => {
    dmUserList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      if (docSnap.id !== currentUser.uid) {
        const user = docSnap.data();
        const btn = document.createElement("button");
        btn.textContent = user.name;
        btn.onclick = () => abrirDM(docSnap.id, user.name);
        dmUserList.appendChild(btn);
      }
    });
  });
}

function abrirDM(userId, name) {
  currentDMUser = userId;
  privateChatBox.style.display = "block";
  dmMsgForm.style.display = "flex";
  const chatId = [currentUser.uid, userId].sort().join("_");
  const q = query(collection(db, "dms", chatId, "messages"), orderBy("createdAt", "asc"));
  onSnapshot(q, async (snapshot) => {
    privateChatBox.innerHTML = `<h4>Chat com ${name}</h4>`;
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const p = document.createElement("p");
      p.innerHTML = `<strong>${msg.sender === currentUser.uid ? "Eu" : name}:</strong> ${msg.text}`;
      privateChatBox.appendChild(p);
    });
  });
}

dmMsgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = dmMsgInput.value;
  if (!text || !currentDMUser) return;
  const chatId = [currentUser.uid, currentDMUser].sort().join("_");
  await addDoc(collection(db, "dms", chatId, "messages"), {
    sender: currentUser.uid,
    text: text,
    createdAt: serverTimestamp()
  });
  dmMsgInput.value = "";
});

// === NOTIFICAÇÕES ===
function carregarNotificacoes() {
  const q = query(collection(db, "notifications", currentUser.uid, "items"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    notificationList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      const li = document.createElement("li");
      li.textContent = notif.text;
      notificationList.appendChild(li);
    });
  });
}

notificationBtn.onclick = () => {
  notificationModal.style.display = "block";
};
closeBtn.onclick = () => {
  notificationModal.style.display = "none";
};
window.onclick = (event) => {
  if (event.target == notificationModal) {
    notificationModal.style.display = "none";
  }
};
