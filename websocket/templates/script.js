document.addEventListener("DOMContentLoaded", () => {
  const cardsContainer = document.getElementById("frends");
  const chatContainer = document.getElementById("chat");
  const btnChat = document.getElementById("btnchat");
  const chatInput = document.getElementById("chatinput");
  const btnCall = document.getElementById("btnCall");
  const name = document.getElementById("name").textContent;

  let activeChatUser = null; // выбранный друг для чата
  const userImages = {};
  const pendingOnline = new Set();
  const chats = {};

  function norm(username) {
    return username.trim();
  }

  // =====================
  // Отображение чата
  // =====================
  function renderChat(username) {
    chatContainer.innerHTML = `<h2>Чат с ${username}</h2><div class="chat-messages"></div>`;
    activeChatUser = username;

    const messagesDiv = chatContainer.querySelector(".chat-messages");
    const history = chats[username] || [];
    messagesDiv.innerHTML = "";

    history.forEach(msg => {
      if (!msg || !msg.text) return;
      const p = document.createElement("p");
      p.textContent = `${msg.from}: ${msg.text}`;
      p.classList.add(msg.from === name ? "msg-me" : "msg-friend");
      messagesDiv.appendChild(p);
    });
  }

  // =====================
  // Добавление сообщения
  // =====================
  function addMessage(username, from, text) {
    if (!chats[username]) chats[username] = [];
    chats[username].push({ from, text });

    if (activeChatUser === username) {
      const messagesDiv = chatContainer.querySelector(".chat-messages");
      if (messagesDiv) {
        const p = document.createElement("p");
        p.textContent = `${from}: ${text}`;
        p.classList.add(from === name ? "msg-me" : "msg-friend");
        messagesDiv.appendChild(p);
      }
    }
  }

  // =====================
  // WebSocket
  // =====================
  const ws = new WebSocket("/ws");

  ws.onopen = () => {
    ws.send(JSON.stringify({ status: "login", name }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // ===== Список друзей =====
    if (data.status === "frends") {
      cardsContainer.innerHTML = "";
      for (const key in data) {
        if (key === "status") continue;

        const div = document.createElement("div");
        div.classList.add("friend-card");

        const img = document.createElement("img");
        img.src = data[key];
        img.classList.add("imgg");
        img.dataset.username = key;

        const h1 = document.createElement("h1");
        h1.textContent = key;

        div.appendChild(img);
        div.appendChild(h1);
        cardsContainer.appendChild(div);

        userImages[key] = img;

        // Клик по карточке друга
        div.addEventListener("click", () => {
          if (!chats[key]) chats[key] = [];
          renderChat(key);

          // отправка на сервер о начале чата
          ws.send(JSON.stringify({ status: "chat", name, frend: key }));

          // Обновляем кнопку звонка
          btnCall.dataset.user = key;
          btnCall.textContent = `📞 Позвонить ${key}`;
        });

        if (pendingOnline.has(key)) {
          img.classList.add("online-glow");
          pendingOnline.delete(key);
        }
      }
    }

    // ===== Онлайн =====
    if (data.status === "online" && data.cont) {
      const usernames = Array.isArray(data.cont) ? data.cont : [data.cont];
      usernames.forEach(rawName => {
        const username = norm(rawName);
        const img = userImages[username];
        if (img) img.classList.add("online-glow");
        else pendingOnline.add(username);
      });
    }

    // ===== Оффлайн =====
    if (data.status === "offline" && data.cont) {
      const usernames = Array.isArray(data.cont) ? data.cont : [data.cont];
      usernames.forEach(rawName => {
        const username = norm(rawName);
        const img = userImages[username];
        if (img) img.classList.remove("online-glow");
      });
    }

    // ===== Сообщение =====
    if (data.status === "message") {
      const { from, to, text } = data;
      if (to === name) addMessage(from, from, text);
    }

    // ===== История чата =====
    if (data.status === "chat-out") {
      const { sender, text } = data;
      if (!sender || !text || sender.length !== text.length) return;
      const chatUser = sender[0];
      const messages = sender.map((s, i) => ({ from: s, text: text[i] }));
      chats[chatUser] = messages;
      renderChat(chatUser);
    }

    // ===== WebRTC звонки =====
    if (["call-offer", "call-answer", "ice-candidate"].includes(data.status)) {
      handleWebRTCMessage(data, ws, name);
    }
  };

  ws.onerror = (err) => {
    console.error("Ошибка WebSocket ⚠️", err);
  };

  ws.onclose = () => {
    console.log("Соединение закрыто ❌");
  };

  // =====================
  // Отправка сообщений
  // =====================
  btnChat.addEventListener("click", () => {
    if (!activeChatUser) return alert("Выберите друга для чата!");
    const text = chatInput.value.trim();
    if (!text) return;

    const msg = { status: "message", from: name, to: activeChatUser, text };
    ws.send(JSON.stringify(msg));
    addMessage(activeChatUser, name, text);
    chatInput.value = "";
  });

  // =====================
  // Кнопка звонка
  // =====================
  btnCall.addEventListener("click", () => {
    const frend = btnCall.dataset.user;
    if (!frend) return alert("Выберите друга для звонка!");
    startCall(true, null, ws, name, frend);
  });
});
