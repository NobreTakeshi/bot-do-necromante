const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

// --- 🔒 CONFIGURAÇÃO ---
const ALLOWED_CHATS = [
    '120363401096340709@g.us', 
    '559887200815@c.us',       
    '559292276201@c.us'        
];

const ARQUIVO_ARTHUR = './ficha_arthur.json';
const ARQUIVO_YUKINE = './ficha_yukine.json';
const PASTA_BACKUP = './backups/';

// --- 📊 TABELAS & CONSTANTES ---
const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
const RANK_THRESHOLDS = [1, 16, 31, 51, 71, 86, 96]; 

// Banco de Dados para !addextra funcionar com lógica
const DB_HABILIDADES_EXTRAS = {
    "forca elevada": { attr: "forca", nome: "Força Elevada" },
    "velocidade elevada": { attr: "velocidade", nome: "Velocidade Elevada" },
    "durabilidade de aco": { attr: "res_fisica", nome: "Durabilidade de Aço" },
    "vitalidade elevada": { attr: "hp_max", nome: "Vitalidade Elevada" },
    "arcanismo supremo": { attr: "poder_magico", nome: "Arcanismo Supremo" },
    "controle magico elevado": { attr: "controle_magico", nome: "Controle Mágico Elevado" },
    "resistencia magica elevada": { attr: "res_magica", nome: "Resistência Mágica Elevada" },
    "fonte inesgotavel": { attr: "mp_max", nome: "Fonte Inesgotável" },
    "precisao elevada": { attr: "precisao", nome: "Precisão Elevada" }
};

// --- 👤 FICHAS BASE ---
const BASE_ARTHUR = {
    nome_jog: "Ryusaki", idade_jog: "+20", disp_jog: "A noite",
    nome_pers: "Arthur I'n Waker", idade_pers: "+1000", genero: "M",
    personalidade: "Calma, reservado, arrogante e animado",
    classe: "Necromante", social: "Plebeu", condicao: "Fardo da Eternidade",
    aparencia: "Rimuru Tempest", dinheiro: { bronze: 50, prata: 50, ouro: 50 },

    nivel: 1, xp: 0, rank: 'E', rankIndex: 0, pontos_livres: 0,
    elementos: ["Trevas"], fusoes: [], habilidades_extras: ["Intensificação Mágica"],
    itens: ["Arco das Almas (Raro)", "Égide do Vazio (Raro)"],
    lista_habilidades: ["Constructo", "Legião Oculta", "Miasma", "Transferência", "Colheita"],
    
    atributos: { forca: 8, velocidade: 8, res_fisica: 10, poder_magico: 15, controle_magico: 15, res_magica: 3, precisao: 5 },
    multiplicadores: { res_fisica: 4, itens: 1.60 },
    // Multiplicadores Extras começam em 1 (sem buff)
    multiplicadores_extra: { forca: 1, velocidade: 1, res_fisica: 1, poder_magico: 1, controle_magico: 1, res_magica: 1, precisao: 1, hp_max: 1, mp_max: 1 },
    
    hp_atual: 300, mp_atual: 425, hp_max: 300, mp_max: 425,
    cooldowns: { intensificacao: 0, constructo: 0, legiao: 0, miasma: 0, transferencia: 0, colheita: 0, vortice: 0, disparo: 0 },
    ativos: { intensificacao: 0, miasma: 0, colheita: 0, colheitaStack: 0, vortice: 0 }
};

const BASE_YUKINE = {
    nome_pers: "Yukine Crysmir", nivel: 1, xp: 0, rank: 'D', 
    elementos: ["Água"], habilidades_extras: ["Fonte Inesgotável"],
    lista_habilidades: ["Berço do Monstro", "Monstro Profundezas", "Bênção Oceano"],
    atributos: { forca: 6, velocidade: 5, res_fisica: 8, poder_magico: 20, controle_magico: 23, res_magica: 5, precisao: 3 },
    multiplicadores_extra: { mp_max: 2 }, 
    hp_atual: 140, mp_atual: 1000, hp_max: 140, mp_max: 1000,
    cargas_coracao: 0, 
    cooldowns: { berco: 0, tentaculos: 0, bencao: 0 },
    ativos: { berco: 0, tentaculos: 0, bencao: 0 }
};

let fichaArthur = {};
let fichaYukine = {};

// --- SISTEMA DE ARQUIVOS ---
function carregarDados() {
    try {
        if (fs.existsSync(ARQUIVO_ARTHUR)) {
            fichaArthur = JSON.parse(fs.readFileSync(ARQUIVO_ARTHUR));
            if (!fichaArthur.multiplicadores_extra) {
                fichaArthur.multiplicadores_extra = BASE_ARTHUR.multiplicadores_extra;
                salvarArthur();
            }
        } else { fichaArthur = JSON.parse(JSON.stringify(BASE_ARTHUR)); salvarArthur(); }
        
        if (fs.existsSync(ARQUIVO_YUKINE)) fichaYukine = JSON.parse(fs.readFileSync(ARQUIVO_YUKINE));
        else { fichaYukine = JSON.parse(JSON.stringify(BASE_YUKINE)); salvarYukine(); }
        
        console.log('✅ Dados carregados.');
    } catch (err) { console.error('Erro load:', err); }
}
function salvarArthur() { try { fs.writeFileSync(ARQUIVO_ARTHUR, JSON.stringify(fichaArthur, null, 2)); } catch (err) {} }
function salvarYukine() { try { fs.writeFileSync(ARQUIVO_YUKINE, JSON.stringify(fichaYukine, null, 2)); } catch (err) {} }

function criarBackup(slot) {
    if (!fs.existsSync(PASTA_BACKUP)) fs.mkdirSync(PASTA_BACKUP);
    fs.writeFileSync(`${PASTA_BACKUP}arthur_${slot}.json`, JSON.stringify(fichaArthur, null, 2));
    fs.writeFileSync(`${PASTA_BACKUP}yukine_${slot}.json`, JSON.stringify(fichaYukine, null, 2));
    return `💾 Backup Slot ${slot} criado!`;
}
function carregarBackup(slot) {
    if (fs.existsSync(`${PASTA_BACKUP}arthur_${slot}.json`)) {
        fichaArthur = JSON.parse(fs.readFileSync(`${PASTA_BACKUP}arthur_${slot}.json`));
        fichaYukine = JSON.parse(fs.readFileSync(`${PASTA_BACKUP}yukine_${slot}.json`));
        salvarArthur(); salvarYukine();
        return `📂 Backup Slot ${slot} carregado!`;
    } return `🚫 Slot ${slot} vazio.`;
}

carregarDados();
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('LICH SYSTEM V22 - FINAL ONLINE'));

client.on('message', async msg => {
    if (!ALLOWED_CHATS.includes(msg.from)) return;
    const chat = await msg.getChat();
    const rawText = msg.body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // --- RESET / SAVE ---
    if (rawText === '!resetar ficha') {
        fichaArthur = JSON.parse(JSON.stringify(BASE_ARTHUR)); 
        fichaYukine = JSON.parse(JSON.stringify(BASE_YUKINE));
        salvarArthur(); salvarYukine();
        return client.sendMessage(msg.from, "🔄 Sistema resetado.");
    }
    if (rawText.startsWith('!save')) return client.sendMessage(msg.from, criarBackup(rawText.split(' ')[1] || '1'));
    if (rawText.startsWith('!load')) return client.sendMessage(msg.from, carregarBackup(rawText.split(' ')[1] || '1'));

    // --- PULAR / DEFINIR TURNO ---
    if (rawText.startsWith('!definirturno') || rawText.startsWith('!setturno')) {
        let valor = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(valor)) {
            fichaArthur.turnosTotais = valor; // Define o turno manualmente
            salvarArthur();
            await client.sendMessage(msg.from, `⏳ **Cronograma Alterado:** Turno definido para **${valor}**.`);
        } else {
            await client.sendMessage(msg.from, "⚠️ Use: `!definirturno [numero]`");
        }
        return; // Para não executar outros comandos
    }

    // --- VISUALIZAÇÃO ---
    if (rawText === '!menu' || rawText === '!ajuda') await client.sendMessage(msg.from, gerarMenuAjuda());
    if (rawText === '!ficha') await client.sendMessage(msg.from, gerarFichaEsteticaArthur());
    if (rawText === '!status') await client.sendMessage(msg.from, gerarStatusArthur());
    if (rawText === '!pontos') await client.sendMessage(msg.from, `💎 Pontos Livres: **${fichaArthur.pontos_livres}**`);
    
    // --- SERVO (YUKINE) ---
    if (rawText === '!servo' || rawText === '!yukine') {
        await client.sendMessage(msg.from, gerarFichaYukine());
    }
    if (rawText.startsWith('!yusar')) await processarYukineSkill(msg.from, rawText);
    if (rawText.startsWith('!ydano')) {
        let v = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(v)) { fichaYukine.hp_atual -= v; salvarYukine(); await client.sendMessage(msg.from, `❄️ Yukine HP: ${fichaYukine.hp_atual}/${fichaYukine.hp_max}`); }
    }

    // --- PROGRESSÃO ARTHUR ---
    if (rawText.startsWith('!xp')) {
        let valor = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(valor)) { let res = adicionarXP(valor); salvarArthur(); await client.sendMessage(msg.from, res); }
    }
    if (rawText.startsWith('!up')) {
        let args = rawText.split(' '); let atributo = args[1]; let qtd = parseInt(args[2]);
        if (!qtd || qtd <= 0 || fichaArthur.pontos_livres < qtd) return client.sendMessage(msg.from, `🚫 Pontos insuficientes.`);
        let map = { 'forca': 'forca', 'vel': 'velocidade', 'resfisica': 'res_fisica', 'podermagico': 'poder_magico', 'controlemagico': 'controle_magico', 'resmagica': 'res_magica', 'precisao': 'precisao' };
        let key = Object.keys(map).find(k => atributo.includes(k));
        if (key) {
            fichaArthur.atributos[map[key]] += qtd; fichaArthur.pontos_livres -= qtd; salvarArthur();
            await client.sendMessage(msg.from, `✅ ${map[key].toUpperCase()} +${qtd}`);
        }
    }
    if (rawText.startsWith('!historia')) {
        let p = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(p)) { let res = calcularXPHistoria(p); let msgXP = adicionarXP(res.xpTotal); salvarArthur(); await client.sendMessage(msg.from, `${res.msg}\n\n${msgXP}`); }
    }

    // --- EDIÇÃO RÁPIDA (ADD) ---
    // 1. ADICIONAR EXTRA (COM LÓGICA DE BUFF)
    if (rawText.startsWith('!addextra')) {
        let input = msg.body.split(' ').slice(1).join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (DB_HABILIDADES_EXTRAS[input]) {
            let hab = DB_HABILIDADES_EXTRAS[input];
            // Aplica o multiplicador x2
            fichaArthur.multiplicadores_extra[hab.attr] = 2;
            // Adiciona nome na lista
            fichaArthur.habilidades_extras.push(hab.nome);
            salvarArthur();
            await client.sendMessage(msg.from, `✨ **Extra Aplicado!**\n"${hab.nome}"\n✅ Atributo [${hab.attr}] agora é x2!`);
        } else {
            await client.sendMessage(msg.from, `🚫 Habilidade não reconhecida no sistema. Tente: Arcanismo Supremo, Força Elevada, etc.`);
        }
    }
    // 2. ADICIONAR ELEMENTO
    if (rawText.startsWith('!addelemento')) {
        let nome = msg.body.split(' ').slice(1).join(' ');
        fichaArthur.elementos.push(nome); 
        salvarArthur(); 
        await client.sendMessage(msg.from, `🌑 Elemento Adicionado: ${nome}`);
    }
    // 3. ADICIONAR SKILL
    if (rawText.startsWith('!addskill') || rawText.startsWith('!novahabilidade')) {
        let nome = msg.body.split(' ').slice(1).join(' ');
        fichaArthur.lista_habilidades.push(nome); 
        salvarArthur(); 
        await client.sendMessage(msg.from, `📚 Skill Adicionada: ${nome}`);
    }
    // 4. ADICIONAR PONTOS
    if (rawText.startsWith('!addpontos')) {
        let valor = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(valor)) { 
            fichaArthur.pontos_livres += valor; 
            salvarArthur(); 
            await client.sendMessage(msg.from, `💎 +${valor} Pontos Adicionados.`); 
        }
    }

    // --- COMBATE ARTHUR ---
    if (rawText.startsWith('!testeefeito')) {
        let args = rawText.split(' ');
        if(args[1] && args[2]) await client.sendMessage(msg.from, calcularResistenciaMagica(parseInt(args[1]), parseInt(args[2])));
    }
    if (rawText.startsWith('!dano')) {
        let v = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(v)) { fichaArthur.hp_atual -= v; salvarArthur(); await client.sendMessage(msg.from, `💔 HP: ${fichaArthur.hp_atual}/${calcularMaxHP()}`); }
    }
    if (rawText.startsWith('!curar')) {
        let v = parseInt(rawText.replace(/[^0-9]/g, ''));
        if (!isNaN(v)) { fichaArthur.hp_atual = Math.min(calcularMaxHP(), fichaArthur.hp_atual + v); salvarArthur(); await client.sendMessage(msg.from, `🧪 HP: ${fichaArthur.hp_atual}/${calcularMaxHP()}`); }
    }
    if (rawText === '!cena') await processarTurno(msg.from);
    if (rawText.startsWith('!usar')) await processarArthurSkill(msg.from, rawText);
});

// ================= FUNÇÕES VISUAIS =================

function gerarMenuAjuda() {
    return `_Todos os comandos para gerenciar Arthur I'n Waker._

📂 **SISTEMA & SALVAMENTO**
• *!save [número]* ➝ Cria um ponto de restauração (Salva Arthur e Yukine).
  _Ex: !save 1 (Salva antes do Boss)_
• *!load [número]* ➝ Carrega um ponto salvo.
  _Ex: !load 1 (Volta se algo der errado)_
• *!resetar ficha* ➝ Apaga TUDO e volta ao Nível 1.

📊 **VISUALIZAÇÃO DE DADOS**
• *!ficha* ➝ Mostra a ficha completa (Lore, Estética, Listas).
• *!status* ➝ Mostra a ficha técnica de combate (Dano, Defesa, HP, CDs).
• *!pontos* ➝ Mostra saldo de pontos livres para gastar.
• *!servo* (ou *!yukine*) ➝ Mostra a ficha e status do Yukine.

📈 **EVOLUÇÃO E PROGRESSÃO**
• *!xp [valor]* ➝ Adiciona XP. O bot calcula Nível, Rank e Bônus sozinho.
  _Ex: !xp 500_
• *!up [atributo] [qtd]* ➝ Gasta pontos livres para aumentar status.
  _Ex: !up forca 5_ (Usa "resfisica", "podermagico", etc).
• *!historia [palavras]* ➝ Calcula recompensa de textos narrativos.
  _Ex: !historia 650_ (Calcula base + bônus).

⚔️ **COMBATE ARTHUR**
• *!cena* ➝ **IMPORTANTE!** Passa o turno. Aplica Regen, Fardo, Loucura e Cooldowns (Afeta Arthur e Yukine).
• *!dano [valor]* / *!curar [valor]* ➝ Altera HP do Arthur.
• *!usar [habilidade]* ➝ Ativa skills do Arthur.
  _Skills: Miasma, Constructo, Legião, Colheita, Intensificação, Vórtice (Escudo), Disparo (Arco)_
• *!testeefeito [danoBase] [RM]* ➝ Calcula Magia vs Resistência.

❄️ **COMBATE SERVO (YUKINE)**
• *!ydano [valor]* ➝ Altera HP do Yukine.
• *!yusar [habilidade]* ➝ Usa skills do Yukine.
  _Skills: Berço, Tentáculos, Bênção_

📚 **EDIÇÃO RÁPIDA (ADD)**
• *!addskill [nome]* ➝ Adiciona nova skill de combate na lista.
• *!addelemento [nome]* ➝ Adiciona novo elemento desbloqueado.
• *!addextra [nome]* ➝ Adiciona habilidade extra do sistema (Aplica Buff).
• *!addpontos [qtd]* ➝ (GM) Força adição de pontos livres.`;
}

function gerarFichaEsteticaArthur() {
    let a = fichaArthur.atributos;
    let n = fichaArthur.nivel;
    const pad = (num) => num < 10 ? `0${num}` : num;

    const formatSlot = (list, idx, req) => {
        if (list[idx]) return `— ${list[idx]}`;
        if (n >= req) return `— ʟɪʙᴇʀᴀᴅᴏ (ᴇꜱᴄᴏʟʜᴇʀ)`;
        return `— ʙʟᴏqᴜᴇᴀᴅᴏ🔒(ɴᴠʟ.${req})`;
    };

    let itensStr = fichaArthur.itens.map(i => `— ${i}`).join('\n');

    return `.

       《ᴅᴀᴅᴏꜱ ᴅᴇ ᴊᴏɢᴀᴅᴏʀ》

ɴᴏᴍᴇ: ${fichaArthur.nome_jog}
ɪᴅᴀᴅᴇ: ${fichaArthur.idade_jog}
ᴅɪꜱᴩᴏɴɪʙɪʟɪᴅᴀᴅᴇ: ${fichaArthur.disp_jog}

       《ᴅᴀᴅᴏꜱ ᴅᴇ ᴩᴇʀꜱᴏɴᴀɢᴇᴍ 》

ɴᴏᴍᴇ: ${fichaArthur.nome_pers}
ɪᴅᴀᴅᴇ: ${fichaArthur.idade_pers}
ɢêɴᴇʀᴏ (ᴍ/ꜰ): ${fichaArthur.genero}
ᴩᴇʀꜱᴏɴᴀʟɪᴅᴀᴅᴇ: ${fichaArthur.personalidade}
ᴄʟᴀꜱꜱᴇ: ${fichaArthur.classe}
ᴄʟᴀꜱꜱᴇ ꜱᴏᴄɪᴀʟ: ${fichaArthur.social}
ᴄᴏɴᴅɪçãᴏ ɪɴᴀᴛᴀ: ${fichaArthur.condicao}
ᴀᴩᴀʀêɴᴄɪᴀ (2D/3D): ${fichaArthur.aparencia}
ɴíᴠᴇʟ/ʀᴀɴᴋɪɴɢ: ${pad(n)}/${fichaArthur.rank}
xᴩ: ${fichaArthur.xp}/${n * 100}
🪙ᴅɪɴʜᴇɪʀᴏ: 
— 🥉ʙʀᴏɴᴢᴇ: [${fichaArthur.dinheiro.bronze}]
— 🥈ᴩʀᴀᴛᴀ: [${fichaArthur.dinheiro.prata}]
— 🥇ᴏᴜʀᴏ: [${fichaArthur.dinheiro.ouro}]

      《ᴇʟᴇᴍᴇɴᴛᴏꜱ ᴍáɢɪᴄᴏꜱ》

${formatSlot(fichaArthur.elementos, 0, 1)}
${formatSlot(fichaArthur.elementos, 1, 10)}
${formatSlot(fichaArthur.elementos, 2, 20)}
${formatSlot(fichaArthur.elementos, 3, 30)}

       《ꜰᴜꜱõᴇꜱ ᴇʟᴇᴍᴇɴᴛᴀɪꜱ》

${formatSlot(fichaArthur.fusoes, 0, 20)}
${formatSlot(fichaArthur.fusoes, 1, 30)}
${formatSlot(fichaArthur.fusoes, 2, 40)}
${formatSlot(fichaArthur.fusoes, 3, 50)}

       《ʜᴀʙɪʟɪᴅᴀᴅᴇꜱ ᴇxᴛʀᴀꜱ》

${formatSlot(fichaArthur.habilidades_extras, 0, 1)}
${formatSlot(fichaArthur.habilidades_extras, 1, 5)}
${formatSlot(fichaArthur.habilidades_extras, 2, 10)}

       《ᴩᴏɴᴛᴏꜱ ᴅᴇ ᴀᴛʀɪʙᴜᴛᴏꜱ》

— ꜰᴏʀçᴀ: [${pad(a.forca)}]
— ᴠᴇʟᴏᴄɪᴅᴀᴅᴇ: [${pad(a.velocidade)}]
— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ꜰíꜱɪᴄᴀ: [${pad(a.res_fisica)}] ×4 ${a.res_fisica * 4}
— ᴩᴏᴅᴇʀ ᴍáɢɪᴄᴏ: [${pad(a.poder_magico)}]
— ᴄᴏɴᴛʀᴏʟᴇ ᴍáɢɪᴄᴏ: [${pad(a.controle_magico)}]
— ʀᴇꜱɪꜱᴛêɴᴄɪᴀ ᴍáɢɪᴄᴀ: [${pad(a.res_magica)}]
— ᴩʀᴇᴄɪꜱãᴏ: [${pad(a.precisao)}]
— ʜ.ᴩ.: [${fichaArthur.hp_atual}/${calcularMaxHP()}] Reg por turno 20%
— ᴍ.ᴩ.: [${fichaArthur.mp_atual}/${calcularMaxMP()}] Reg por turno 20%

ɴᴏᴛᴀ: ${fichaArthur.pontos_livres} ᴩᴏɴᴛᴏꜱ ʟɪᴠʀᴇꜱ 

      《ʟɪꜱᴛᴀ ᴅᴇ ɪᴛᴇɴꜱ》

${itensStr}`;
}

function gerarStatusArthur() {
    let a = getAtributosFinais();
    let m = fichaArthur.multiplicadores;
    let me = fichaArthur.multiplicadores_extra;
    const show = (val, mult) => mult > 1 ? `${val/mult} (Buff x${mult}: ${val})` : `${val}`;

    let danoFisico = a.forca * 20;
    let defesaFisica = (a.res_fisica * 20) * m.res_fisica;
    let danoMagico = a.poder_magico * 20;
    let defesaMagica = (a.res_magica * 2) * 20; 
    let velocidadeMs = a.velocidade * 0.5;

    let listaCD = [];
    for (let skill in fichaArthur.cooldowns) if (fichaArthur.cooldowns[skill] > 0) listaCD.push(`${skill.toUpperCase()}: ${fichaArthur.cooldowns[skill]}t`);
    let textoCD = listaCD.length > 0 ? listaCD.join(' | ') : "✅ Habilidades Prontas";

    // --- LISTA DE ATIVOS ATUALIZADA ---
    let listaAtivos = [];
    if (fichaArthur.ativos.constructo > 0) listaAtivos.push(`🤖 Constructo em Campo (${fichaArthur.ativos.constructo}t)`);
    if (fichaArthur.ativos.legiao > 0) listaAtivos.push(`👥 Legião Oculta Aberta (${fichaArthur.ativos.legiao}t)`);
    if (fichaArthur.ativos.intensificacao > 0) listaAtivos.push(`✨ Intensificação Mágica (${fichaArthur.ativos.intensificacao}t)`);
    if (fichaArthur.ativos.miasma > 0) listaAtivos.push(`☠️ Miasma Ativo (${fichaArthur.ativos.miasma}t)`);
    if (fichaArthur.ativos.colheita > 0) listaAtivos.push(`🌑 Colheita Stack: ${fichaArthur.ativos.colheitaStack}/3`);
    if (fichaArthur.ativos.vortice > 0) listaAtivos.push(`🛡️ Vórtice de Negação (${fichaArthur.ativos.vortice}t)`);
    
    let textoAtivos = listaAtivos.length > 0 ? listaAtivos.join('\n') : "---";

    return `📜 **FICHA TÉCNICA: ARTHUR I'N WAKER**
━━━━━━━━━━━━━━━━━━━━
👤 Nível: ${fichaArthur.nivel} (Rank ${fichaArthur.rank})
✨ XP: ${fichaArthur.xp} / ${fichaArthur.nivel * 100}
💎 Pontos Livres: ${fichaArthur.pontos_livres}
━━━━━━━━━━━━━━━━━━━━
❤ HP: ${fichaArthur.hp_atual} / ${calcularMaxHP()}
💙 MP: ${fichaArthur.mp_atual} / ${calcularMaxMP()}
━━━━━━━━━━━━━━━━━━━━
📊 **ATRIBUTOS**
💪 Força: ${show(a.forca, me.forca)} (Dano: ${danoFisico})
🏃 Velocidade: ${show(a.velocidade, me.velocidade)} (${velocidadeMs} m/s)
🛡 Res. Física: ${show(a.res_fisica, me.res_fisica)} (Fardo x4) (Defesa: ${defesaFisica})
✨ Poder Mágico: ${show(a.poder_magico, me.poder_magico)} (Dano: ${danoMagico})
🌀 Controle Mágico: ${show(a.controle_magico, me.controle_magico)}
🔮 Res. Mágica: ${show(a.res_magica, me.res_magica)} (RMT: ${defesaMagica})
🎯 Precisão: ${show(a.precisao, me.precisao)}
━━━━━━━━━━━━━━━━━━━━
🌪 **STATUS ATUAL**
⏳ Recargas: ${textoCD}
⚡ Efeitos Ativos:
${textoAtivos}
━━━━━━━━━━━━━━━━━━━━
📚 **HABILIDADES DE COMBATE**
${fichaArthur.lista_habilidades.join(', ')}`;
}

function gerarFichaYukine() {
    let y = fichaYukine;
    let a = y.atributos;
    let hpAguaViva = (a.poder_magico * 20); 
    
    let listaCD = [];
    for (let skill in y.cooldowns) if (y.cooldowns[skill] > 0) listaCD.push(`${skill.toUpperCase()}: ${y.cooldowns[skill]}t`);
    let textoCD = listaCD.length > 0 ? listaCD.join(' | ') : "✅ Prontas";

    return `❄️ **SERVO: YUKINE CRYSMIR**
━━━━━━━━━━━━━━━━━━━━
👤 Nível: ${y.nivel} (Rank ${y.rank}) | Classe: Mago
❤ HP: ${y.hp_atual}/${y.hp_max}
💙 MP: ${y.mp_atual}/${y.mp_max} (Fonte Inesgotável x2)
❄️ Cargas Coração: ${y.cargas_coracao}/10 (-${y.cargas_coracao*5}% Custo MP)
━━━━━━━━━━━━━━━━━━━━
📊 **ATRIBUTOS**
✨ Poder Mágico: ${a.poder_magico} (Dano: ${a.poder_magico*20})
🌀 Controle: ${a.controle_magico}
🔮 Res. Mágica: ${a.res_magica}
━━━━━━━━━━━━━━━━━━━━
⚔️ **HABILIDADES**
⏳ CDs: ${textoCD}
1. **Berço (Barreira):** Defesa ${55 + (a.poder_magico*20)}
2. **Tentáculos:** Dano Base 110 (Alcance 25m)
3. **Bênção (Cura):** HP Criatura ${hpAguaViva} (Cura 60%/turno)`;
}

// ================= CÁLCULOS =================

function getAtributosFinais() {
    let base = fichaArthur.atributos;
    let mult = fichaArthur.multiplicadores_extra;
    // Previne crash em saves antigos
    if (!mult) mult = { forca: 1, velocidade: 1, res_fisica: 1, poder_magico: 1, controle_magico: 1, res_magica: 1, precisao: 1, hp_max: 1, mp_max: 1 };
    
    return {
        forca: base.forca * mult.forca,
        velocidade: base.velocidade * mult.velocidade,
        res_fisica: base.res_fisica * mult.res_fisica,
        poder_magico: base.poder_magico * mult.poder_magico,
        controle_magico: base.controle_magico * mult.controle_magico,
        res_magica: base.res_magica * mult.res_magica,
        precisao: base.precisao * mult.precisao
    };
}
function calcularMaxHP() { 
    if(!fichaArthur.multiplicadores_extra) return fichaArthur.hp_max;
    return Math.floor(fichaArthur.hp_max * fichaArthur.multiplicadores_extra.hp_max); 
}
function calcularMaxMP() { 
    if(!fichaArthur.multiplicadores_extra) return fichaArthur.mp_max;
    return Math.floor(fichaArthur.mp_max * fichaArthur.multiplicadores_extra.mp_max); 
}

function calcularXPHistoria(palavras) {
    let xpBase = 0;
    if (palavras >= 500) xpBase = 1500;
    else if (palavras >= 400) xpBase = 1000;
    else if (palavras >= 300) xpBase = 500;
    else return { xpTotal: 0, msg: "⚠️ Mínimo 300 palavras." };
    let bonusExtras = Math.floor((palavras - (palavras >= 500 ? 500 : (palavras >= 400 ? 400 : 300))) / 25) * 100;
    return { xpTotal: xpBase + bonusExtras, msg: `✍️ **NARRATIVA:** ${palavras} palavras | XP: ${xpBase + bonusExtras}` };
}

function adicionarXP(quantidade) {
    fichaArthur.xp += quantidade;
    let msg = `🆙 *XP +${quantidade}*\n`;
    let xpNecessario = fichaArthur.nivel * 100; 
    while (fichaArthur.xp >= xpNecessario && fichaArthur.nivel < 100) {
        fichaArthur.xp -= xpNecessario; fichaArthur.nivel++;
        fichaArthur.pontos_livres += 5; fichaArthur.atributos.poder_magico += 15; fichaArthur.atributos.controle_magico += 15;
        let hpAdd = 50; let mpAdd = 200; 
        fichaArthur.hp_max += hpAdd; fichaArthur.mp_max += mpAdd; fichaArthur.hp_atual += hpAdd; fichaArthur.mp_atual += mpAdd;
        msg += `🎉 **LEVEL UP!** Nível ${fichaArthur.nivel}!\n`;
        let novoRankIndex = 0;
        for (let i = 0; i < RANK_THRESHOLDS.length; i++) if (fichaArthur.nivel >= RANK_THRESHOLDS[i]) novoRankIndex = i;
        if (novoRankIndex > fichaArthur.rankIndex) {
            fichaArthur.rankIndex = novoRankIndex; fichaArthur.rank = RANKS[fichaArthur.rankIndex];
            fichaArthur.pontos_livres += 10; fichaArthur.hp_max += 100; fichaArthur.mp_max += 100; fichaArthur.hp_atual += 100; fichaArthur.mp_atual += 100;
            msg += `🌟 **RANK UP!** Rank **${fichaArthur.rank}**\n`;
        }
        xpNecessario = fichaArthur.nivel * 100;
    }
    return msg;
}

function calcularResistenciaMagica(danoBase, rmAlvo) {
    let attr = getAtributosFinais();
    let dme = danoBase + (attr.poder_magico * 20);
    let rmt = rmAlvo * 2 * 20;
    return (dme > rmt) ? `✅ **SUCESSO!** (DME ${dme} > RMT ${rmt})` : `❌ **RESISTIU!** (DME ${dme} <= RMT ${rmt})`;
}

async function processarTurno(chatId) {
    // --- CORREÇÃO SEGURANÇA NAN ---
    if (!fichaArthur.turnosTotais || isNaN(fichaArthur.turnosTotais)) fichaArthur.turnosTotais = 0;

    fichaArthur.turnosTotais++;
    let log = `📜 *TURNO ${fichaArthur.turnosTotais}*\n\n`;
    
    // REGEN
    let regenPct = 0.20; 
    if (fichaArthur.ativos.colheita > 0) {
        if (fichaArthur.ativos.colheitaStack < 3) fichaArthur.ativos.colheitaStack++;
        regenPct += fichaArthur.ativos.colheitaStack * 0.05;
        log += `🌑 *Colheita:* Regen MP +${(fichaArthur.ativos.colheitaStack * 0.05)*100}%\n`;
    } else { fichaArthur.ativos.colheitaStack = 0; }

    let maxHP = calcularMaxHP(); let maxMP = calcularMaxMP();
    let curaHP = Math.floor(maxHP * 0.20); let curaMP = Math.floor(maxMP * regenPct);
    fichaArthur.hp_atual = Math.min(maxHP, fichaArthur.hp_atual + curaHP);
    fichaArthur.mp_atual = Math.min(maxMP, fichaArthur.mp_atual + curaMP);
    log += `💚 **Arthur:** +${curaHP} HP | 💙 +${curaMP} MP\n`;

    // FARDO / LOUCURA
    if (fichaArthur.turnosTotais > 0 && fichaArthur.turnosTotais % 10 === 0) {
        let dano = Math.floor(maxHP * 0.05); fichaArthur.hp_atual -= dano; log += `⚠️ *Fardo:* -${dano} HP\n`;
    }
    let dado = Math.floor(Math.random() * 100) + 1;
    if (dado <= 10) log += `🎲 *Loucura (10%):* ⚠️ **AJA IMPRUDENTEMENTE!**\n`;

    // YUKINE
    fichaYukine.cargas_coracao = Math.min(10, fichaYukine.cargas_coracao + 1); 
    let yukineMPGain = Math.floor(fichaYukine.mp_max * 0.05);
    fichaYukine.mp_atual = Math.min(fichaYukine.mp_max, fichaYukine.mp_atual + yukineMPGain);
    log += `❄️ **Yukine:** Coração de Gelo (+${yukineMPGain} MP, ${fichaYukine.cargas_coracao} Cargas)\n`;

    // --- ATUALIZAÇÃO DOS CONTADORES (DURAÇÃO) ---
    if (fichaArthur.ativos.constructo > 0) fichaArthur.ativos.constructo--;
    if (fichaArthur.ativos.legiao > 0) fichaArthur.ativos.legiao--;
    if (fichaArthur.ativos.intensificacao > 0) fichaArthur.ativos.intensificacao--;
    if (fichaArthur.ativos.miasma > 0) fichaArthur.ativos.miasma--;
    if (fichaArthur.ativos.colheita > 0) fichaArthur.ativos.colheita--;
    if (fichaArthur.ativos.vortice > 0) fichaArthur.ativos.vortice--;
    
    // REDUZ RECARGAS
    for (let skill in fichaArthur.cooldowns) if (fichaArthur.cooldowns[skill] > 0) fichaArthur.cooldowns[skill]--;
    
    if (fichaYukine.ativos.berco > 0) fichaYukine.ativos.berco--;
    if (fichaYukine.ativos.tentaculos > 0) fichaYukine.ativos.tentaculos--;
    if (fichaYukine.ativos.bencao > 0) fichaYukine.ativos.bencao--;
    for (let skill in fichaYukine.cooldowns) if (fichaYukine.cooldowns[skill] > 0) fichaYukine.cooldowns[skill]--;

    salvarArthur(); salvarYukine();
    
    // AQUI ELE CHAMA O STATUS ATUALIZADO
    log += `\n` + gerarStatusArthur();
    await client.sendMessage(chatId, log);
}

async function processarArthurSkill(chatId, texto) {
    let msg = "";
    let attr = getAtributosFinais(); // Pega atributos com buffs (ex: Arcanismo)

    if (texto.includes('constructo')) {
        if(fichaArthur.mp_atual < 100) return client.sendMessage(chatId, "Sem mana!");
        
        // Lógica de Sistema
        fichaArthur.mp_atual -= 100; 
        fichaArthur.cooldowns.constructo = 2; // Tempo para conjurar de novo
        fichaArthur.ativos.constructo = 3;    // Tempo de Duração em campo
        
        // Cálculos do Servo (Baseados nos seus atributos atuais)
        let hpC = Math.floor((attr.poder_magico * 20) * 0.15);
        let str = Math.floor(attr.poder_magico * 1.5);
        let spd = Math.floor(attr.controle_magico * 1.5);
        let res = Math.floor(attr.poder_magico * 1.5);

        // Ficha Visual Detalhada
        msg = `🤖 **CONSTRUCTO DE ÉTER SOMBRIO** (3 Turnos)
━━━━━━━━━━━━━━━━━━━━
❤ **HP:** ${hpC}
🛡️ **Res. Física:** ${res}
🔮 **Res. Mágica:** ${res}
━━━━━━━━━━━━━━━━━━━━
📊 **ATRIBUTOS**
💪 **Força:** ${str} (Dano: ${str*20})
🏃 **Velocidade:** ${spd} (${spd/2} m/s)
━━━━━━━━━━━━━━━━━━━━
⚙️ *Gasto: 100 MP*`;
    }
    else if (texto.includes('legiao')) {
        if(fichaArthur.mp_atual < 200) return client.sendMessage(chatId, "Sem mana!");
        fichaArthur.mp_atual -= 200; 
        fichaArthur.cooldowns.legiao = 5;
        fichaArthur.ativos.legiao = 4; 
        msg = `👥 **LEGIÃO OCULTA ATIVA** (4 Turnos)\nCapacidade: ${fichaArthur.nivel * 2} servos.`;
    }
    else if (texto.includes('miasma')) {
        if(fichaArthur.mp_atual < 300) return client.sendMessage(chatId, "Sem mana!");
        fichaArthur.mp_atual -= 300; 
        fichaArthur.cooldowns.miasma = 7; 
        fichaArthur.ativos.miasma = 6;
        msg = `☠️ **MIASMA ATIVADO** (6 Turnos)\nEfeitos: Aura, Vertigem, Lentidão, Dreno, Corrosão.`;
    }
    else if (texto.includes('colheita')) {
        fichaArthur.ativos.colheita = 3; 
        fichaArthur.cooldowns.colheita = 3; 
        msg = `💀 **COLHEITA INICIADA** (3 Turnos)`;
    }
    else if (texto.includes('intensificacao')) {
        fichaArthur.ativos.intensificacao = 3; 
        fichaArthur.cooldowns.intensificacao = 3; 
        msg = `✨ **INTENSIFICAÇÃO!** (3 Turnos)`;
    }
    else if (texto.includes('vortice') || texto.includes('escudo')) {
        if (fichaArthur.cooldowns.vortice > 0) return client.sendMessage(chatId, `⏳ Recarga: ${fichaArthur.cooldowns.vortice}t`);
        fichaArthur.ativos.vortice = 2; 
        fichaArthur.cooldowns.vortice = 4;
        msg = `🛡️ **VÓRTICE DE NEGAÇÃO** (2 Turnos)\nNulifica próximo dano mágico. 50% vira MP.`;
    }
    else if (texto.includes('disparo') || texto.includes('arco')) {
        if(fichaArthur.mp_atual < 20) return client.sendMessage(chatId, "Sem mana!");
        fichaArthur.mp_atual -= 20; 
        
        // Cálculo do Dano (Base Personagem + Arma Rara)
        let danoBase = attr.poder_magico * 20;
        let danoArco = 440; 
        let danoTotal = danoBase + danoArco;

        msg = `🏹 **DISPARO PARASITÁRIO**
━━━━━━━━━━━━━━━━━━━━
💥 **Dano Mágico Total:** ${danoTotal}
*(Base: ${danoBase} + Arco: ${danoArco})*
━━━━━━━━━━━━━━━━━━━━
🩸 **Efeito:** O dano causado cura o servo aliado mais próximo.
⚙️ *Gasto: 20 MP*`;
    }

    if (msg) { salvarArthur(); await client.sendMessage(chatId, msg); }
}

async function processarYukineSkill(chatId, texto) {
    let msg = "";
    let y = fichaYukine;
    let desconto = 1 - (y.cargas_coracao * 0.05);
    
    if (texto.includes('berco')) {
        let custo = 150 * desconto;
        if(y.mp_atual < custo) return client.sendMessage(chatId, "Yukine sem mana!");
        y.mp_atual -= custo; y.cooldowns.berco = 3; y.ativos.berco = 3;
        msg = `❄️ **BERÇO DO MONSTRO MAR** (Custo: ${custo.toFixed(0)})\nBarreira Rotativa. Dano Refletido.`;
    }
    else if (texto.includes('tentaculos')) {
        let custo = 300 * desconto;
        if(y.mp_atual < custo) return client.sendMessage(chatId, "Yukine sem mana!");
        y.mp_atual -= custo; y.cooldowns.tentaculos = 5; y.ativos.tentaculos = 4;
        msg = `🐙 **MONSTRO DAS PROFUNDEZAS** (Custo: ${custo.toFixed(0)})\n8 Tentáculos de água.`;
    }
    else if (texto.includes('bencao')) {
        let custo = 500 * desconto;
        if(y.mp_atual < custo) return client.sendMessage(chatId, "Yukine sem mana!");
        y.mp_atual -= custo; y.cooldowns.bencao = 6; y.ativos.bencao = 5;
        msg = `💧 **BÊNÇÃO DO OCEANO** (Custo: ${custo.toFixed(0)})\nÁgua Viva Gigante. Cura massiva.`;
    }

    if (msg) { salvarYukine(); await client.sendMessage(chatId, msg); }
}

client.initialize();
