const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path')

const filePath = path.join(__dirname, 'usageData.json');
const videoPinsPath = path.join(__dirname, 'video_pins.json');

let { requestsMade, lastUpdate } = readUsageData();
let scrapedIDs = readVideoPins();

async function scrapePinterest() {
    const browser = await puppeteer.launch({headless: "new",
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
    ]
});
    const urls = [
    "https://br.pinterest.com/search/pins/?q=itachi%20edit%20videos&rs=guide&add_refine=Videos%7Cguide%7Cword%7C2",
    "https://br.pinterest.com/search/pins/?q=naruto%20edits%20video&rs=guide&add_refine=Video%7Cguide%7Cword%7C2",
    "https://br.pinterest.com/search/videos/?q=dragon%20ball%20edit%20videos&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=Death%20Note%20edits&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=Fullmetal%20Alchemist%20e%20Fullmetal%20Alchemist%20edit&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=One%20Piece%20edit%20anime&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=Boku%20no%20Hero%20Academia%20edit&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=shingeki%20no%20kyojin%20edit&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=anime%20edit%2060fps&rs=content_type_filter",
    "https://br.pinterest.com/search/videos/?q=anime%20edit%204k&rs=content_type_filter"
];
    const randomUrl = urls[Math.floor(Math.random() * urls.length)];
    console.log(randomUrl);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36');
    await page.goto(randomUrl);

    await page.waitForSelector('a[href^="/pin/"]');

    const pins = await page.$$eval('a[href^="/pin/"]', anchors => {
        return anchors.map(anchor => anchor.href.split('/pin/')[1].split('/')[0]);
    });

    const newPins = pins.filter(pin => !scrapedIDs.has(pin));

    if (newPins.length === 0) {
        console.log('Nenhum novo ID encontrado.');
        await browser.close();
        return;
    }

    for (const id of newPins) {
        if (requestsMade >= 200) {
            console.log("Você atingiu o limite mensal de 200 requisições.");
            break;
        }

        const finalURL = `https://br.pinterest.com/pin/${id}`;
        const videoURL = await getVideoURL(finalURL);
        if (videoURL) {
            const videoBuffer = await downloadVideo(videoURL); 
            scrapedIDs.add(id);
            updateVideoPins(scrapedIDs);
            requestsMade += 1;
            updateUsageData(requestsMade);
            return videoBuffer; 
        }
    }

    await browser.close();
}

function readUsageData() {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler o arquivo de dados:', error);
        return { requestsMade: 0, lastUpdate: new Date().toISOString() };
    }
}

function updateUsageData(requestsMade) {
    try {
        const data = JSON.stringify({ requestsMade, lastUpdate: new Date().toISOString() });
        fs.writeFileSync(filePath, data, 'utf-8');
    } catch (error) {
        console.error('Erro ao atualizar o arquivo de dados:', error);
    }
}

function readVideoPins() {
    try {
        const data = fs.readFileSync(videoPinsPath, 'utf-8');
        return new Set(JSON.parse(data));
    } catch (error) {
        console.error('Erro ao ler o arquivo de pins:', error);
        return new Set(); 
    }
}

function updateVideoPins(scrapedIDs) {
    try {
        const data = JSON.stringify([...scrapedIDs]);
        fs.writeFileSync(videoPinsPath, data, 'utf-8');
    } catch (error) {
        console.error('Erro ao atualizar o arquivo de pins:', error);
    }
}

async function getVideoURL(finalURL) {
    const options = {
        method: 'GET',
        url: 'https://pinterest-video-and-image-downloader.p.rapidapi.com/pinterest',
        params: {
            url: finalURL
        },
        headers: {
            'X-RapidAPI-Key': '960c82f895msh0b0ce3ce02eb537p1768b1jsn112a832b4994',
            'X-RapidAPI-Host': 'pinterest-video-and-image-downloader.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        if (response.data.success && response.data.type === "video") {
            return response.data.data.url;
        }
    } catch (error) {
        console.error('Erro ao obter a URL do vídeo da API:', error);
        return null;
    }
}

async function downloadVideo(videoURL) {
    const response = await axios.get(videoURL, { responseType: 'arraybuffer' });  // Observe o responseType
    return Buffer.from(response.data);  // Retorna diretamente o buffer do vídeo
}

//scrapePinterest();


//scrapePinterest().then(() => {
//    console.log('Raspagem concluída!');
//}).catch(err => {
//    console.error('Erro durante a raspagem:', err);
//});

module.exports = scrapePinterest; 
