// =========================================================
// A CONFIGURAÇÃO DO SEU FIREBASE
// Substitua pelas suas chaves
const firebaseConfig = {
    apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
    authDomain: "social-media-93276.firebaseapp.com",
    projectId: "social-media-93276",
    storageBucket: "social-media-93276.firebasestorage.app",
    messagingSenderId: "837381193847",
    appId: "1:837381193847:web:0b33f09354a8bbb90a0672",
    measurementId: "G-0JRNSXYYLQ"
};

// =========================================================
// IMPORTS E INICIALIZAÇÃO DO FIREBASE
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =========================================================
// GESTÃO DE AUTENTICAÇÃO E NAVEGAÇÃO ENTRE PÁGINAS
// =========================================================
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname === '/';
    
    if (user) {
        // Usuário logado
        if (isLoginPage) {
            window.location.href = 'feed.html';
        }
    } else {
        // Usuário não logado
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});

// =========================================================
// LÓGICA DA PÁGINA DE LOGIN
// =========================================================
if (document.getElementById('login-form')) {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: email,
                createdAt: serverTimestamp(),
                uid: userCredential.user.uid
            });
            alert('Conta criada com sucesso! Você será redirecionado.');
        } catch (error) {
            alert("Erro ao registrar: " + error.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Erro ao logar: " + error.message);
        }
    });
}

// =========================================================
// LÓGICA DA PÁGINA DE FEED (CHAT)
// =========================================================
if (document.getElementById('message-area')) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageArea = document.getElementById('message-area');
    const logoutButton = document.getElementById('logout-button');

    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
    });

    const displayMessage = (message) => {
        const p = document.createElement('p');
        p.className = 'bg-gray-200 rounded-lg p-2 max-w-xs';
        p.textContent = (message.userName || 'Anônimo') + ': ' + message.text;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    };

    sendButton.addEventListener('click', async () => {
        const text = messageInput.value.trim();
        if (text && auth.currentUser) {
            try {
                const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                const userName = currentUserDoc.data()?.name || auth.currentUser.email;

                await addDoc(collection(db, "messages"), {
                    userId: auth.currentUser.uid,
                    userName: userName,
                    text: text,
                    createdAt: serverTimestamp(),
                });
                messageInput.value = '';
            } catch (e) {
                console.error("Erro ao adicionar documento: ", e);
            }
        }
    });

    const q = query(collection(db, "messages"), orderBy("createdAt"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayMessage(change.doc.data());
            }
        });
    });
}

// =========================================================
// LÓGICA DA PÁGINA DE PERFIL
// =========================================================
if (document.getElementById('profile-form')) {
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username-input');
    const imageUrlInput = document.getElementById('image-url-input');
    const profileName = document.getElementById('profile-name');
    const profileImage = document.getElementById('profile-image');
    const userList = document.getElementById('user-list');
    const friendsList = document.getElementById('friends-list');
    const searchInput = document.getElementById('search-input');
    const logoutButtonProfile = document.getElementById('logout-button-profile');

    logoutButtonProfile.addEventListener('click', async () => {
        await signOut(auth);
    });

    const loadProfile = async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            profileName.textContent = userData.name || 'Nome não definido';
            profileImage.src = userData.image || 'https://via.placeholder.com/150';
            usernameInput.value = userData.name || '';
            imageUrlInput.value = userData.image || '';
        }
        loadFriendsList();
        loadAllUsers();
    };

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userName = usernameInput.value;
        const imageUrl = imageUrlInput.value || 'https://via.placeholder.com/150';
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            name: userName,
            image: imageUrl,
            uid: auth.currentUser.uid,
        }, { merge: true });
        await loadProfile();
        alert('Perfil salvo com sucesso!');
    });

    const addFriend = async (friendId) => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        let friends = userDoc.data().friends || [];
        if (!friends.includes(friendId)) {
            friends.push(friendId);
            await updateDoc(userDocRef, { friends: friends });
            alert('Amigo adicionado!');
            loadFriendsList();
        }
    };
    window.addFriend = addFriend;

    const loadFriendsList = async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        friendsList.innerHTML = '';
        if (userDoc.exists() && userDoc.data().friends) {
            const friendIds = userDoc.data().friends;
            for (const friendId of friendIds) {
                const friendDoc = await getDoc(doc(db, "users", friendId));
                if (friendDoc.exists()) {
                    const friendData = friendDoc.data();
                    const li = document.createElement('li');
                    li.textContent = friendData.name;
                    li.className = "bg-white p-2 rounded-lg shadow-sm"
                    friendsList.appendChild(li);
                }
            }
        }
    };

    const loadAllUsers = async (searchTerm = '') => {
        userList.innerHTML = '';
        const usersCol = collection(db, "users");
        const q = query(usersCol);
        const snapshot = await getDocs(q);
        
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            if (userId !== auth.currentUser.uid && (userData.name.toLowerCase().includes(searchTerm.toLowerCase()) || userData.email?.toLowerCase().includes(searchTerm.toLowerCase()))) {
                const userName = userData.name || 'Anônimo';
                const li = document.createElement('li');
                li.className = "flex justify-between items-center bg-white p-2 rounded-lg shadow-sm";
                li.innerHTML = `
                    <span>${userName}</span>
                    <button onclick="addFriend('${userId}')" class="bg-blue-500 text-white text-sm py-1 px-3 rounded-lg hover:bg-blue-600">Adicionar</button>
                `;
                userList.appendChild(li);
            }
        });
    };
    
    searchInput.addEventListener('input', (e) => {
        loadAllUsers(e.target.value);
    });

    loadProfile();
}
