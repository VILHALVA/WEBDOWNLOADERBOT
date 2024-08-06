import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config(); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, 'temp_files');

const createTempDir = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
  }
};

const clearTempDir = () => {
  if (fs.existsSync(TEMP_DIR)) {
    fs.readdirSync(TEMP_DIR).forEach(file => {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    });
  }
};

const downloadFile = async (url, filePath) => {
  const writer = fs.createWriteStream(filePath);
  const response = await axios({ url, responseType: 'stream' });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

const createZip = async (dir) => {
  const zip = new JSZip();
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      zip.file(file, fs.readFileSync(filePath));
    }
  }
  return zip.generateAsync({ type: 'nodebuffer' });
};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply(
        `😀Olá ${ctx.from.first_name}, eu sou o Bot de Download de Web.\n\n` +
        `Eu posso baixar todos os componentes (.html, .css, img, xml, vídeo, javascript..) de URLs.\n\n` +
        `Envie qualquer URL,\npor exemplo: 'https://www.google.com'`
    );      
});

bot.on('text', async (ctx) => {
  const url = ctx.message.text;

  if (!url.startsWith('http')) {
    return ctx.reply("🤬A URL deve começar com 'http' ou 'https'");
  }

  createTempDir();

  try {
    const fileName = 'page.html';
    const filePath = path.join(TEMP_DIR, fileName);

    const response = await axios.get(url);
    fs.writeFileSync(filePath, response.data);

    const zipBuffer = await createZip(TEMP_DIR);
    const zipFilePath = path.join(TEMP_DIR, 'page.zip');
    fs.writeFileSync(zipFilePath, zipBuffer);

    await ctx.replyWithChatAction('upload_document'); 
    await ctx.replyWithDocument({ source: zipFilePath });

  } catch (error) {
    console.error(error);
    ctx.reply('😢Algo deu errado!');
  } finally {
    clearTempDir();
  }
});

bot.launch();
