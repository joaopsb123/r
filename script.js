// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, setDoc, getDoc, 
  collection, addDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === Configuração Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyAi4ov0jXHiH645K_zXDpO0yOtosZHQ0Ww",
  authDomain: "socialapp-b67e0.firebaseapp.com",
  projectId: "socialapp-b67e0",
  storageBucket: "socialapp-b67e0.firebasestorage.app",
  messagingSenderId: "798450413930",
  appId: "1:798450413930:web:a8441ff7a2b7d1d6417513",
  measurementId: "G-4TGTE5EMWQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// === Elementos DOM ===
const authSection = document.getElementById("authSection");
const feedSection = document.getElementById("feedSection");
const authForm = document.getElementById("authForm");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authBtn = document.getElementById("authBtn");
const toggleAuthLink = document.getElementById("toggleAuthLink");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const authMessage = document.getElementById("authMessage");
const logoutBtn = document.getElementById("logoutBtn");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const logo = document.querySelector(".logo");

let isLoginMode = true;
let currentUser = null;

// === Renderizar posts ===
function renderPost(id, data) {
  const div = document.createElement("div");
  div.classList.add("post");
  div.innerHTML = `
    <div class="post-header">
      <img src="${data.profilePicUrl || 'https://i.pravatar.cc/150?u=' + data.userId}" alt="foto">
      <strong>${data.username}</strong>
    </div>
    <div class="post-content">
      <p>${data.text}</p>
    </div>
    <div class="post-footer">
      <button class="likeBtn">❤️ ${data.likes?.length || 0}</button>
      <button class="commentBtn">💬 Comentários</button>
      <p>${data.timestamp?.toDate().toLocaleString() || ''}</p>
    </div>
  `;

  div.querySelector(".likeBtn").addEventListener("click", async () => {
    const postRef = doc(db, "posts", id);
    await updateDoc(postRef, {
      likes: arrayUnion(currentUser.uid)
    });
  });

  div.querySelector(".commentBtn").addEventListener("click", () => {
    const comment = prompt("Escreve um comentário:");
    if (comment) {
      alert("Comentário enviado: " + comment);
    }
  });

  feed.prepend(div);
}

// === Autenticação ===
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    if (isLoginMode) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      currentUser = userCredential.user;
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
      authMessage.textContent = "🎉 Conta criada com sucesso!";
    }
  } catch (error) {
    console.error("Erro de autenticação:", error);
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

// === Google login ===
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  client_id: "837381193847-cp1asre7t3ubmunq600v3qkq9m7vca98.apps.googleusercontent.com",
  prompt: "select_account"
});

googleAuthBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        name: currentUser.displayName,
        email: currentUser.email,
        bio: "",
        profilePicUrl: currentUser.photoURL,
        following: [],
        followers: []
      });
    }
    authMessage.textContent = "✅ Login com Google feito!";
  } catch (err) {
    console.error("Erro Google:", err);
    authMessage.textContent = "⚠️ " + err.message;
  }
});

// === Logout ===
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// === Estado do utilizador ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authSection.style.display = "none";
    feedSection.style.display = "block";
    logoutBtn.style.display = "inline-block";
    logo.textContent = "📷 Feed";

    onSnapshot(collection(db, "posts"), (snapshot) => {
      feed.innerHTML = "";
      snapshot.forEach((docSnap) => renderPost(docSnap.id, docSnap.data()));
    });
  } else {
    currentUser = null;
    authSection.style.display = "flex";
    feedSection.style.display = "none";
    logoutBtn.style.display = "none";
    logo.textContent = "MinhaSocial";
  }
});

// === Criar Post ===
postBtn.addEventListener("click", async () => {
  const text = postInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "posts"), {
    userId: currentUser.uid,
    username: currentUser.displayName || currentUser.email,
    profilePicUrl: currentUser.photoURL || null,
    text: text,
    likes: [],
    timestamp: serverTimestamp()
  });
  postInput.value = "";
});
