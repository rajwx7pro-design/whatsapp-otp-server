const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const app = express();
app.use(express.json());

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened successfully!');
        }
    });

    // Request Pairing Code using your phone number
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            // Yahan apna WhatsApp mobile number country code (+91) ke sath daalein
            const phoneNumber = "918928082194"; 
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("====================================");
            console.log(`YOUR WHATSAPP PAIRING CODE: ${code}`);
            console.log("====================================");
        }, 3000);
    }
}

connectToWhatsApp();

app.get('/send-otp', async (req, res) => {
    const { phone, otp } = req.query;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    try {
        const formattedPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
        const message = `Your Artist Divya Studio verification code is ${otp}. Valid for 10 minutes.`;
        
        await sock.sendMessage(formattedPhone, { text: message });
        res.json({ success: true, message: 'OTP sent on WhatsApp' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
