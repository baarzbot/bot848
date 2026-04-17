const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const NodeCache = require('node-cache')

const msgRetryCounterCache = new NodeCache()

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        msgRetryCounterCache,
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) {
            console.log('Scan QR ini di WhatsApp:')
            qrcode.generate(qr, {small: true})
        }
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('connection closed, reconnecting:', shouldReconnect)
            if(shouldReconnect) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('Bot connected')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message) return
        const messageType = Object.keys(msg.message)[0]
        const from = msg.key.remoteJid
        const body = messageType === 'conversation'? msg.message.conversation : messageType === 'extendedTextMessage'? msg.message.extendedTextMessage.text : ''
        
        if (body == '.ping') {
            await sock.sendMessage(from, { text: 'Pong!' })
        }
    })
}

startBot()
