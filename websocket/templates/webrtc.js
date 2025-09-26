let localStream = null;
let peerConnection = null;
let activeCallUser = null;

const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const remoteVideo = document.getElementById("remoteVideo");
const localVideo = document.getElementById("localVideo");

// =====================
// Инициализация локального видео
// =====================
async function initLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) localVideo.srcObject = localStream;
    console.log("Локальный поток готов");
  } catch (err) {
    console.error("Ошибка получения локального потока:", err);
  }
}

// =====================
// Старт звонка
// isCaller = true → создаём offer
// isCaller = false → получен offer, создаём answer
// =====================
async function startCall(isCaller, remoteOffer = null, ws, name, frend) {
  if (!localStream) {
    alert("Локальный поток ещё не готов! Подождите...");
    return;
  }

  activeCallUser = frend;
  peerConnection = new RTCPeerConnection(servers);

  // Добавляем локальные треки
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Получение удалённого потока
  peerConnection.ontrack = (event) => {
    if (remoteVideo) remoteVideo.srcObject = event.streams[0];
    console.log("Удалённый поток получен");
  };

  // ICE кандидаты
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({ status: "ice-candidate", to: activeCallUser, candidate: event.candidate }));
      console.log("Отправлен ICE кандидат:", event.candidate);
    }
  };

  if (isCaller) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ status: "call-offer", to: activeCallUser, offer }));
    console.log("Отправлен звонок пользователю:", activeCallUser);
  } else {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    ws.send(JSON.stringify({ status: "call-answer", to: activeCallUser, answer }));
    console.log("Отправлен ответ на звонок пользователю:", activeCallUser);
  }
}

// =====================
// Обработка WebSocket сообщений для WebRTC
// =====================
function handleWebRTCMessage(data, ws, name) {
  if (data.status === "call-offer") {
    const { from, offer } = data;
    console.log("Входящий звонок от", from);
    startCall(false, offer, ws, name, from);
  }

  if (data.status === "call-answer") {
    const { answer } = data;
    if (peerConnection) peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("Получен ответ на звонок");
  }

  if (data.status === "ice-candidate") {
    const candidate = new RTCIceCandidate(data.candidate);
    if (peerConnection) peerConnection.addIceCandidate(candidate);
    console.log("Добавлен ICE кандидат:", candidate);
  }
}

// =====================
// Запуск локального видео при загрузке страницы
// =====================
initLocalStream();
