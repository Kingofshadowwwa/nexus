import sqlite3
import datetime
from pyexpat.errors import messages

import timeee

# Устанавливаем соединение с базой данных
connection = sqlite3.connect('my_database.db')
cyr = connection.cursor()

async def Login(Name,password):
    cyr.execute('SELECT Login ,Password,img_avatars FROM db_login WHERE Login = (?)',(Name,))
    data = cyr.fetchall()
    password_local = data[0][1]
    img = data[0][2]
    if password == password_local:
        return True,img
    else:
        return False
async def avatars_frends(name):
    cyr.execute('SELECT Frends FROM db_login WHERE Login = (?)', (name,))
    data = cyr.fetchall()
    src = data[0][0].split()
    b = {}
    b['status'] = 'frends'
    for i in src:
        cyr.execute('SELECT img_avatars FROM db_login WHERE Login = (?)',(i,))
        b[f'{i}'] = '/static/avatars/' + cyr.fetchall()[0][0]
    else:
        return b



async def UploadChat(User, Friend):
    cyr.execute(
        '''
        SELECT sender, Chat  FROM chat 
        WHERE sender = ? AND receiver = ?;'''
    ,(User,Friend))
    rows = cyr.fetchall()
    cyr.execute(
        '''
        SELECT sender, Chat  FROM chat 
        WHERE sender = ? AND receiver = ? ;'''
    ,(Friend,User))
    rows1 = cyr.fetchall()
    messages = rows +rows1
    messages.reverse()
    return messages
async def NewMessage(User,Friend,message):
    datatime = timeee.time_chat()
    cyr.execute('INSERT INTO chat (sender, receiver, chat,Time) VALUES (?, ?, ?,?)',
          (Friend,User , message,datatime))
    connection.commit()
    return
