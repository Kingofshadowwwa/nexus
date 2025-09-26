from aiohttp import web, WSMsgType
import aiohttp_jinja2
import jinja2
import database as db
import json

app = web.Application()
aiohttp_jinja2.setup(app, loader=jinja2.FileSystemLoader('templates/'))
routes = web.RouteTableDef()

users = {}          # {username: ws}
users_online = []   # список онлайновых имён

# ===== ФУНКЦИИ ДЛЯ WS =====
async def handle_login(ws, username):
    users[username] = ws
    if username not in users_online:
        users_online.append(username)

    # список друзей
    out = await db.avatars_frends(username)
    if out is None:
        out = {}
    out["status"] = "frends"
    await ws.send_str(json.dumps(out))

    # список кто онлайн
    out_online_list = list(set(users_online))
    out_online = {'status': 'online', 'cont': out_online_list}
    await ws.send_str(json.dumps(out_online))

    # уведомление другим пользователям
    notify = {'status': 'online', 'cont': username}
    json_notify = json.dumps(notify)
    for user, client_ws in users.items():
        if user != username:
            await client_ws.send_str(json_notify)


async def chat_api(ws, Name, Friend):
    db1 = await db.UploadChat(Name, Friend)
    list_sender = []
    list_text = []
    for i in db1:
        list_text.append(i[1])
        list_sender.append(i[0])
    json_chat = {"status": "chat-out", "sender": list_sender, "text": list_text}
    await ws.send_str(json.dumps(json_chat))


# ===== WS endpoint =====
@routes.get('/ws')
async def websocket_api(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    username = None

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                except json.JSONDecodeError:
                    continue

                status = data.get("status")

                # ===== маршрутизация =====
                if status == "login":
                    username = data.get("name")
                    if username:
                        await handle_login(ws, username)

                elif status == "ping":
                    await ws.send_str(json.dumps({"status": "pong"}))

                elif status == "chat":
                    await chat_api(ws, data['name'], data['frend'])

                # ===== звонки =====
                elif status == "call" or status == "call-offer":
                    frend = data.get("to")
                    offer = data.get("offer")
                    if frend in users:
                        payload = {
                            "status": "call-offer",
                            "from": username,
                            "offer": offer
                        }
                        await users[frend].send_str(json.dumps(payload))
                        print(f"📞 {username} звонит {frend}")
                    else:
                        print(f"⚠️ {frend} не в сети")

                elif status == "call-answer":
                    frend = data.get("to")
                    answer = data.get("answer")
                    if frend in users:
                        payload = {
                            "status": "call-answer",
                            "from": username,
                            "answer": answer
                        }
                        await users[frend].send_str(json.dumps(payload))
                        print(f"✅ {username} ответил {frend}")
                    else:
                        print(f"⚠️ {frend} не в сети, ответ не доставлен")

                elif status == "ice-candidate":
                    frend = data.get("to")
                    candidate = data.get("candidate")
                    if frend in users:
                        payload = {
                            "status": "ice-candidate",
                            "from": username,
                            "candidate": candidate
                        }
                        await users[frend].send_str(json.dumps(payload))
                        print(f"🌍 ICE от {username} -> {frend}")

                else:
                    print(f"⚠️ Неизвестный статус: {status}")

            elif msg.type == WSMsgType.ERROR:
                print('WebSocket error:', ws.exception())

    finally:
        # закрытие соединения
        if username and username in users:
            del users[username]
            if username in users_online:
                users_online.remove(username)

            json_list_offline = {'status': 'offline', 'cont': username}
            for user, client_ws in users.items():
                await client_ws.send_str(json.dumps(json_list_offline))

    return ws


# ===== Маршруты страниц =====
@routes.get('/')
@aiohttp_jinja2.template('hello.html')
async def start(request):
    return


@routes.post('/hello')
async def ver(request):
    data = await request.post()
    login = data['login']
    password = data['password']
    a = await db.Login(login, password)
    if a[0]:
        context = {'name': f'{login}', 'avatars': f'/static/avatars/{a[1]}'}
        response = aiohttp_jinja2.render_template('main.html', request, context)
        response.headers['Content-Language'] = 'ru'
        return response
    else:
        return web.Response(text="Ошибка входа", status=401)


@routes.get('/reg')
@aiohttp_jinja2.template('reg.html')
async def ref(request):
    return


@routes.get('/reg_in')
async def reg_in(request):
    data = await request.post()
    print(data)


# ===== Статика =====
app.add_routes(routes)
app.router.add_static('/static/', path='./templates', name='static')

web.run_app(app, port=8081)
