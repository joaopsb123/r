// app.js
// ======================================================================
// VideoT - app.js (completo)
// - Autenticação (Firebase Auth)
// - Firestore (users, videos, likes, comments)
// - Upload para Cloudinary
// - Feed em tempo real + filtros
// - Controlo de reprodução automática / pause
// - Navegação (feed / perfil / inbox) e logout
// ======================================================================

// ---------------------------
// 0. CONFIGURAÇÃO
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
  authDomain: "videot-2fcec.firebaseapp.com",
  projectId: "videot-2fcec",
  storageBucket: "videot-2fcec.appspot.com",
  messagingSenderId: "583396995831",
  appId: "1:583396995831:web:6182575e28ea628cc259f2"
};

const CLOUDINARY_CLOUD_NAME = 'dya1jd0mx';
const CLOUDINARY_UPLOAD_PRESET = 'videot_unsigned_preset';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

// Inicializa Firebase (compatível com snippet que tens nas páginas)
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();

// ---------------------------
// 1. DOM & ESTADO
// ---------------------------
const appContent = document.getElementById('app-content');
const bottomNav = document.getElementById('bottom-nav');
const loadingScreen = document.getElementById('loading-screen');
const feedContainer = document.querySelector('.feed-container');
const feedView = document.getElementById('feed-view');
const profileView = document.getElementById('profile-view');
const inboxView = document.getElementById('inbox-view');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');
const openUploadModalBtn = document.getElementById('open-upload-modal');
const closeUploadModalBtn = document.getElementById('close-upload-modal');
const videoFileInput = document.getElementById('video-file-input');
const videoDescriptionInput = document.getElementById('video-description-input');
const uploadVideoBtn = document.getElementById('upload-video-btn');
const navFeed = document.getElementById('nav-feed');
const navProfile = document.getElementById('nav-profile');
const navInbox = document.getElementById('nav-inbox');
const userVideosGrid = document.getElementById('user-videos-grid');
const filterForYou = document.getElementById('filter-foryou');
const filterFollowing = document.getElementById('filter-following');
const logoutBtn = document.getElementById('logout-btn');

let CURRENT_USER_DATA = null;
let currentVideoPlayer = null;
let unsubscribeFeed = null;
let currentFeedFilter = 'for-you';

// ---------------------------
// 2. UTILITÁRIOS
// ---------------------------
const safeGet = (id) => document.getElementById(id);

// small helper to avoid errors if element missing
const elExists = (el) => !!el;

// ---------------------------
// 3. FETCH USER DATA
// ---------------------------
const fetchUserData = async (uid) => {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      const followingSnapshot = await db.collection('users').doc(uid).collection('following').get();
      const following = followingSnapshot.docs.map(d => d.id);
      return { uid, ...doc.data(), following };
    }
    return null;
  } catch (e) {
    console.error("Erro ao buscar dados do usuário:", e);
    return null;
  }
};

// ---------------------------
// 4. AUTH STATE + REDIRECIONAMENTO
// ---------------------------
auth.onAuthStateChanged(async (user) => {
  // hide loading screen once we know the state
  if (loadingScreen) loadingScreen.classList.add('hidden');

  if (user) {
    // se houver sessão, carrega dados e mostra app
    CURRENT_USER_DATA = await fetchUserData(user.uid);
    if (CURRENT_USER_DATA) {
      if (appContent) appContent.classList.remove('hidden');
      if (bottomNav) bottomNav.classList.remove('hidden');
      navigateTo('feed');
    } else {
      // perfil inexistente em Firestore -> desloga (proteção)
      try { await auth.signOut(); } catch (e) { console.error(e); }
      window.location.replace('login.html');
    }
  } else {
    // sem sessão -> login
    window.location.replace('login.html');
  }
});

// ---------------------------
// 5. LOGOUT
// ---------------------------
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged fará o redirecionamento
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
      alert("Erro ao terminar sessão. Tente novamente.");
    }
  });
}

// ---------------------------
// 6. UPLOAD PARA CLOUDINARY
// ---------------------------
const uploadVideoToCloudinary = async (file) => {
  if (!file) throw new Error('Ficheiro inválido');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const resp = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData
  });

  const data = await resp.json();

  if (!resp.ok || data.error) {
    const msg = data.error?.message || `Erro rede: ${resp.status}`;
    throw new Error(msg);
  }

  return data.secure_url;
};

const handleVideoUpload = async () => {
  if (!CURRENT_USER_DATA) {
    uploadStatus && (uploadStatus.textContent = 'Necessita iniciar sessão.');
    return;
  }

  const file = videoFileInput && videoFileInput.files && videoFileInput.files[0];
  const description = videoDescriptionInput && videoDescriptionInput.value;

  if (!file || !description) {
    uploadStatus && (uploadStatus.textContent = 'Selecione ficheiro e escreva descrição.');
    return;
  }

  uploadVideoBtn && (uploadVideoBtn.disabled = true);
  uploadStatus && (uploadStatus.textContent = 'A enviar vídeo...');

  try {
    const videoUrl = await uploadVideoToCloudinary(file);

    await db.collection('videos').add({
      userId: CURRENT_USER_DATA.uid,
      username: CURRENT_USER_DATA.username || (CURRENT_USER_DATA.email ? CURRENT_USER_DATA.email.split('@')[0] : 'utilizador'),
      description: description,
      videoUrl: videoUrl,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likesCount: 0,
      commentsCount: 0
    });

    uploadStatus && (uploadStatus.textContent = '✅ Vídeo publicado com sucesso!');
    if (videoFileInput) videoFileInput.value = '';
    if (videoDescriptionInput) videoDescriptionInput.value = '';
    setTimeout(() => uploadModal && uploadModal.classList.add('hidden'), 1200);

  } catch (error) {
    console.error("Erro upload:", error);
    uploadStatus && (uploadStatus.textContent = `❌ Erro ao enviar: ${error.message}`);
  } finally {
    uploadVideoBtn && (uploadVideoBtn.disabled = false);
  }
};

// modal listeners (só se existirem)
if (openUploadModalBtn) {
  openUploadModalBtn.addEventListener('click', () => {
    uploadModal && uploadModal.classList.remove('hidden');
    uploadStatus && (uploadStatus.textContent = '');
  });
}
if (closeUploadModalBtn) {
  closeUploadModalBtn.addEventListener('click', () => {
    uploadModal && uploadModal.classList.add('hidden');
  });
}
if (uploadVideoBtn) uploadVideoBtn.addEventListener('click', handleVideoUpload);

// ---------------------------
// 7. FEED EM TEMPO REAL
// ---------------------------
const createVideoCard = (video) => {
  const card = document.createElement('div');
  card.className = 'video-card';

  const isLiked = video.isLiked ? 'style="color: #ff0050;"' : 'style="color: white;"';

  card.innerHTML = `
    <video class="video-player" loop muted src="${video.videoUrl}" playsinline></video>
    <div class="video-overlay" data-video-id="${video.id}">
      <i class="fas fa-play play-pause-icon"></i>
      <div class="video-content-left">
        <div class="user-info">
          <h2 class="video-username" data-user-id="${video.userId}">@${video.username}</h2>
          <p class="description">${escapeHtml(video.description || '')}</p>
          <div class="music-info"><i class="fas fa-music"></i> <span>Música Original</span></div>
        </div>
      </div>
      <div class="video-actions-right">
        <div class="action-button like-btn" data-video-id="${video.id}">
          <i class="fas fa-heart" ${isLiked}></i>
          <span>${video.likesCount || 0}</span>
        </div>
        <div class="action-button comment-btn" data-video-id="${video.id}">
          <i class="fas fa-comment-dots"></i>
          <span>${video.commentsCount || 0}</span>
        </div>
        <div class="action-button"><i class="fas fa-share"></i><span>0</span></div>
        <div class="action-button profile-music-disk">
          <img src="https://i.pravatar.cc/150?img=${(video.userId || '').slice(-1) || '1'}" alt="Perfil" class="profile-pic-disk">
        </div>
      </div>
    </div>
  `;
  return card;
};

const setupRealtimeFeed = (filter = 'for-you') => {
  // limpa listener anterior
  if (unsubscribeFeed) {
    try { unsubscribeFeed(); } catch (e) { /* ignore */ }
    unsubscribeFeed = null;
  }

  if (!feedContainer) return;

  let query = db.collection('videos').orderBy('timestamp', 'desc');

  if (filter === 'following') {
    if (CURRENT_USER_DATA && Array.isArray(CURRENT_USER_DATA.following) && CURRENT_USER_DATA.following.length > 0) {
      // Firestore 'in' only supports up to 10 items — se tiveres >10, deves paginar / usar outra estratégia
      const followList = CURRENT_USER_DATA.following.slice(0, 10);
      query = query.where('userId', 'in', followList);
    } else {
      feedContainer.innerHTML = `<h2 style="color: white; text-align: center; padding-top: 50px;">Siga alguém para ver este feed!</h2>`;
      // ainda assim tenta inicializar controla de vídeo
      setupVideoControl();
      setupInteractionListeners();
      return;
    }
  }

  unsubscribeFeed = query.onSnapshot(async (snapshot) => {
    feedContainer.innerHTML = '';

    // mapeia cada doc para um card (verifica isLiked)
    const cards = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const videoData = {
        id: doc.id,
        userId: data.userId,
        username: data.username || (data.userId ? `user${data.userId.slice(-4)}` : 'user'),
        description: data.description || '',
        videoUrl: data.videoUrl,
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0
      };

      if (CURRENT_USER_DATA) {
        try {
          const likeDoc = await db.collection('videos').doc(videoData.id).collection('likes').doc(CURRENT_USER_DATA.uid).get();
          videoData.isLiked = likeDoc.exists;
        } catch (err) {
          videoData.isLiked = false;
        }
      }

      return createVideoCard(videoData);
    }));

    cards.forEach(card => feedContainer.appendChild(card));

    // configura controlos e listeners
    setupVideoControl();
    setupInteractionListeners();
  }, (err) => {
    console.error("Erro no snapshot do feed:", err);
    feedContainer.innerHTML = `<p style="color: #aaa; padding: 20px;">Erro ao carregar feed. Tente recarregar.</p>`;
  });
};

// escape simples para evitar injeção de HTML nas descrições
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"'`]/g, (s) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
    return map[s] || s;
  });
}

// ---------------------------
// 8. FILTRO: FOR YOU / FOLLOWING
// ---------------------------
if (filterForYou) {
  filterForYou.addEventListener('click', () => {
    filterFollowing && filterFollowing.classList.remove('active');
    filterForYou.classList.add('active');
    currentFeedFilter = 'for-you';
    setupRealtimeFeed('for-you');
  });
}
if (filterFollowing) {
  filterFollowing.addEventListener('click', () => {
    if (!CURRENT_USER_DATA) return;
    filterForYou && filterForYou.classList.remove('active');
    filterFollowing.classList.add('active');
    currentFeedFilter = 'following';
    setupRealtimeFeed('following');
  });
}

// ---------------------------
// 9. CONTROLO AUTOMÁTICO DE VÍDEO (play/pause ao centro do viewport)
// ---------------------------
const handleScroll = () => {
  const videoCards = document.querySelectorAll('.video-card');
  if (!videoCards || videoCards.length === 0) return;

  const viewportHeight = window.innerHeight;
  let closestCard = null;
  let minDistance = Infinity;

  videoCards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const cardCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportHeight / 2;
    const distance = Math.abs(cardCenter - viewportCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closestCard = card;
    }
  });

  if (closestCard) {
    const newVideoPlayer = closestCard.querySelector('.video-player');
    if (newVideoPlayer && currentVideoPlayer !== newVideoPlayer) {
      if (currentVideoPlayer) {
        try {
          currentVideoPlayer.pause();
          const oldIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
          if (oldIcon) oldIcon.style.opacity = '1';
        } catch (e) { /* ignore */ }
      }

      // tentar play (pode falhar por autoplay policies)
      newVideoPlayer.play().catch(() => { /* autoplay pode falhar */ });
      currentVideoPlayer = newVideoPlayer;
      const newIcon = currentVideoPlayer.parentElement.querySelector('.play-pause-icon');
      if (newIcon) newIcon.style.opacity = '0';
    }
  }
};

const setupVideoControl = () => {
  // clona cards para evitar múltiplos listeners duplicados
  document.querySelectorAll('.video-card').forEach(card => {
    const oldCard = card;
    const newCard = oldCard.cloneNode(true);
    oldCard.parentNode.replaceChild(newCard, oldCard);

    const newVideo = newCard.querySelector('.video-player');
    const newIcon = newCard.querySelector('.play-pause-icon');

    // toggle play/pause ao clicar no card (mas não nos botões)
    newCard.addEventListener('click', function (event) {
      if (event.target.closest('.video-actions-right') || event.target.closest('.video-username')) {
        return;
      }
      if (!newVideo) return;
      if (newVideo.paused) {
        newVideo.play().catch(() => {});
        if (newIcon) newIcon.style.opacity = '0';
      } else {
        newVideo.pause();
        if (newIcon) newIcon.style.opacity = '1';
      }
    });
  });

  // chama o handler de scroll para selecionar o vídeo central
  handleScroll();
};

// ---------------------------
// 10. INTERAÇÃO: LIKES, COMMENTS, PROFILE CLICK
// ---------------------------
const handleLike = async (videoId, likeBtnElement) => {
  if (!CURRENT_USER_DATA) return;
  const userId = CURRENT_USER_DATA.uid;
  const videoRef = db.collection('videos').doc(videoId);
  const likeRef = videoRef.collection('likes').doc(userId);

  try {
    const likeDoc = await likeRef.get();
    if (likeDoc.exists) {
      await likeRef.delete();
      await videoRef.update({ likesCount: firebase.firestore.FieldValue.increment(-1) });
      // atualizar UI localmente
      if (likeBtnElement) {
        const span = likeBtnElement.querySelector('span');
        if (span) span.textContent = (parseInt(span.textContent || '0') - 1).toString();
        const icon = likeBtnElement.querySelector('i.fas.fa-heart');
        if (icon) icon.style.color = 'white';
      }
    } else {
      await likeRef.set({ userId, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      await videoRef.update({ likesCount: firebase.firestore.FieldValue.increment(1) });
      if (likeBtnElement) {
        const span = likeBtnElement.querySelector('span');
        if (span) span.textContent = (parseInt(span.textContent || '0') + 1).toString();
        const icon = likeBtnElement.querySelector('i.fas.fa-heart');
        if (icon) icon.style.color = '#ff0050';
      }
    }
  } catch (err) {
    console.error("Erro ao processar like:", err);
  }
};

const handleComment = (videoId) => {
  if (!CURRENT_USER_DATA) return;
  const text = prompt("Adicione seu comentário:");
  if (!text) return;
  db.collection('videos').doc(videoId).collection('comments').add({
    userId: CURRENT_USER_DATA.uid,
    username: CURRENT_USER_DATA.username,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    db.collection('videos').doc(videoId).update({ commentsCount: firebase.firestore.FieldValue.increment(1) });
  }).catch(console.error);
};

const setupInteractionListeners = () => {
  // LIKE buttons
  document.querySelectorAll('.like-btn').forEach(btn => {
    const oldBtn = btn;
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const videoId = this.dataset.videoId;
      handleLike(videoId, this);
    });
  });

  // COMMENT buttons
  document.querySelectorAll('.comment-btn').forEach(btn => {
    const oldBtn = btn;
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const videoId = this.dataset.videoId;
      handleComment(videoId);
    });
  });

  // USERNAME click -> abrir perfil
  document.querySelectorAll('.video-username').forEach(el => {
    const oldEl = el;
    const newEl = oldEl.cloneNode(true);
    oldEl.parentNode.replaceChild(newEl, oldEl);
    newEl.addEventListener('click', function (e) {
      e.stopPropagation();
      const targetUserId = this.dataset.userId;
      navigateTo('profile', targetUserId);
    });
  });
};

// ---------------------------
// 11. PERFIL, INBOX E NAVEGAÇÃO
// ---------------------------
const renderProfilePage = async (targetUserId) => {
  if (!userVideosGrid) return;
  userVideosGrid.innerHTML = '<p style="padding:20px;color:#aaa;">A carregar...</p>';

  try {
    const snapshot = await db.collection('videos')
      .where('userId', '==', targetUserId)
      .orderBy('timestamp', 'desc')
      .get();

    userVideosGrid.innerHTML = '';
    if (snapshot.empty) {
      userVideosGrid.innerHTML = '<p style="padding: 20px; text-align:center;">Nenhum vídeo publicado ainda.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const video = doc.data();
      const thumbnail = document.createElement('img');
      thumbnail.className = 'video-thumbnail';
      // cria thumbnail Cloudinary preview (preview de 1s) se o URL tiver /upload/
      let thumbnailUrl = video.videoUrl;
      try {
        thumbnailUrl = video.videoUrl.replace('/upload/', '/upload/w_300,h_533,c_fill,e_preview:duration_1/');
      } catch (e) { /* keep original */ }
      thumbnail.src = thumbnailUrl;
      userVideosGrid.appendChild(thumbnail);
    });
  } catch (err) {
    console.error("Erro renderProfilePage:", err);
    userVideosGrid.innerHTML = '<p style="padding:20px;color:#aaa;">Erro ao carregar vídeos.</p>';
  }
};

const renderInboxView = () => {
  if (!inboxView) return;
  inboxView.innerHTML = `
    <h2 style="padding: 20px; border-bottom: 1px solid #333;">Caixa de Entrada</h2>
    <div id="chats-list" style="padding: 20px; color: #aaa;">
      <p>Esta é a sua caixa de entrada.</p>
      <p>*Sistema de DMs conceitual.</p>
    </div>
  `;
};

const navigateTo = (viewId, userIdToView = (CURRENT_USER_DATA ? CURRENT_USER_DATA.uid : null)) => {
  // esconder todas as vistas
  feedView && feedView.classList.add('hidden');
  profileView && profileView.classList.add('hidden');
  inboxView && inboxView.classList.add('hidden');

  // limpar active na bottom-nav
  document.querySelectorAll('.bottom-nav .nav-item, .bottom-nav .upload-btn').forEach(item => item.classList.remove('active'));
  document.querySelector('.feed-header') && document.querySelector('.feed-header').classList.
