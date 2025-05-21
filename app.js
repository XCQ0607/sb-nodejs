const os = require('os');
const http = require('http');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec, execSync } = require('child_process');
function ensureModule(name) {
    try {
        require.resolve(name);
    } catch (e) {
        console.log(`Module '${name}' not found. Installing...`);
        execSync(`npm install ${name}`, { stdio: 'inherit' });
    }
}
ensureModule('axios');
ensureModule('ws');
const axios = require('axios');
const { WebSocket, createWebSocketStream } = require('ws');
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const NAME = process.env.NAME || os.hostname();
console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
console.log("甬哥Github项目  ：github.com/yonggekkk");
console.log("甬哥Blogger博客 ：ygkkk.blogspot.com");
console.log("甬哥YouTube频道 ：www.youtube.com/@ygkkk");
console.log("Nodejs真一键无交互Vless代理脚本");
console.log("当前版本：25.5.20 测试beta3版");
console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
async function getVariableValue(variableName, defaultValue) {
    const envValue = process.env[variableName];
    if (envValue) {
        return envValue; 
    }
    if (defaultValue) {
        return defaultValue; 
    }
  let input = '';
  while (!input) {
    input = await ask(`请输入${variableName}: `);
    if (!input) {
      console.log(`${variableName}不能为空，请重新输入!`);
    }
  }
  return input;
}
function ask(question) {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}
async function main() {
    const UUID = await getVariableValue('UUID', ''); // 为保证安全隐蔽，建议留空，可在Node.js界面下的环境变量添加处（Environment variables）,点击ADD VARIABLE，修改变量
    console.log('你的UUID:', UUID);

    const PORT = await getVariableValue('PORT', '');// 为保证安全隐蔽，建议留空，可在Node.js界面下的环境变量添加处（Environment variables）,点击ADD VARIABLE，修改变量
    console.log('你的端口:', PORT);

    const DOMAIN = await getVariableValue('DOMAIN', '');// 为保证安全隐蔽，建议留空，可在Node.js界面下的环境变量添加处（Environment variables）,点击ADD VARIABLE，修改变量
    console.log('你的域名:', DOMAIN);

    // 从API获取优选IP列表
    let apiData = await fetchApiData();
    let lastUpdateTime = new Date().toLocaleString();
    
    // 设置定时任务，每10分钟更新一次API数据
    const updateInterval = 10 * 60 * 1000; // 10分钟，单位为毫秒
    setInterval(async () => {
        console.log('定时更新API数据...');
        try {
            const newApiData = await fetchApiData();
            apiData = newApiData; // 更新全局变量
            lastUpdateTime = new Date().toLocaleString();
            console.log(`API数据已更新，当前共有 ${apiData.length} 个API IP，更新时间: ${lastUpdateTime}`);
        } catch (error) {
            console.error('定时更新API数据失败:', error);
        }
    }, updateInterval);
    console.log(`已设置定时任务，每 ${updateInterval / 60000} 分钟更新一次API数据`);

    const httpServer = http.createServer((req, res) => {
        try {
            // 解析URL和查询参数
            const url = new URL(req.url, `http://${req.headers.host}`);
            const path = url.pathname;
            const isBase64 = url.searchParams.has('base64') || url.searchParams.has('b64');
            
            console.log(`收到请求: ${req.url}, 路径: ${path}, Base64: ${isBase64}`);
            
            if (path === '/') {
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                const statsInfo = `Hello, World-YGkkk\nAPI IP数量: ${apiData.length}\n最后更新时间: ${lastUpdateTime}`;
                res.end(statsInfo);
            } else if (path === `/${UUID}`) {
                let vlessURL;
                // 定义域名列表和对应的名称列表
                const domainList = [
                    // 基本地址
                    { domain: DOMAIN, name: `Vl-ws-tls-${NAME}` },
                    // Cloudflare IP地址
                    { domain: "104.16.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.17.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.18.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.19.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.20.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.21.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.22.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.24.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.25.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.26.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "104.27.0.0", name: `Vl-ws-tls-${NAME}` },
                    { domain: "[2606:4700::]", name: `Vl-ws-tls-${NAME}` },
                    { domain: "[2400:cb00:2049::]", name: `Vl-ws-tls-${NAME}` },
                    // 官方优选
                    { domain: "cf.090227.xyz", name: "三网自适应分流官方优选" },
                    { domain: "ct.090227.xyz", name: "电信官方优选" },
                    { domain: "cmcc.090227.xyz", name: "移动官方优选" },
                    // 官方域名优选
                    { domain: "shopify.com", name: "优选官方域名-shopify" },
                    { domain: "time.is", name: "优选官方域名-time" },
                    { domain: "icook.hk", name: "优选官方域名-icook.hk" },
                    { domain: "icook.tw", name: "优选官方域名-icook.tw" },
                    { domain: "ip.sb", name: "优选官方域名-ip.sb" },
                    { domain: "japan.com", name: "优选官方域名-japan" },
                    { domain: "malaysia.com", name: "优选官方域名-malaysia" },
                    { domain: "russia.com", name: "优选官方域名-russia" },
                    { domain: "singapore.com", name: "优选官方域名-singapore" },
                    { domain: "skk.moe", name: "优选官方域名-skk" },
                    { domain: "www.visa.com.sg", name: "优选官方域名-visa.sg" },
                    { domain: "www.visa.com.hk", name: "优选官方域名-visa.hk" },
                    { domain: "www.visa.com.tw", name: "优选官方域名-visa.tw" },
                    { domain: "www.visa.co.jp", name: "优选官方域名-visa.jp" },
                    { domain: "www.visakorea.com", name: "优选官方域名-visa.kr" },
                    { domain: "www.gco.gov.qa", name: "优选官方域名-gov.qa" },
                    { domain: "www.gov.se", name: "优选官方域名-gov.se" },
                    { domain: "www.gov.ua", name: "优选官方域名-gov.ua" },
                    // 第三方维护
                    { domain: "cfip.xxxxxxxx.tk", name: "OTC提供维护官方优选" },
                    { domain: "bestcf.onecf.eu.org", name: "Mingyu提供维护官方优选" },
                    { domain: "cf.zhetengsha.eu.org", name: "小一提供维护官方优选" },
                    { domain: "xn--b6gac.eu.org", name: "第三方维护官方优选" },
                    { domain: "yx.887141.xyz", name: "第三方维护官方优选" },
                    { domain: "8.889288.xyz", name: "第三方维护官方优选" },
                    { domain: "cfip.1323123.xyz", name: "第三方维护官方优选" },
                    { domain: "cf.515188.xyz", name: "第三方维护官方优选" },
                    { domain: "cf-st.annoy.eu.org", name: "第三方维护官方优选" },
                    { domain: "cf.0sm.com", name: "第三方维护官方优选" },
                    { domain: "cf.877771.xyz", name: "第三方维护官方优选" },
                    { domain: "cf.345673.xyz", name: "第三方维护官方优选" },
                    { domain: "bestproxy.onecf.eu.org", name: "Mingyu提供维护反代优选" },
                    { domain: "proxy.xxxxxxxx.tk", name: "OTC提供维护反代优选" },
                    // 从API获取的IP列表
                    ...apiData
                ];
                
                // 构建vlessURL
                vlessURL = domainList.map(item => 
                    `vless://${UUID}@${item.domain}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${item.name}`
                ).join('\n');
                
                // 检查是否需要Base64编码
                if (isBase64) {
                    console.log('执行Base64编码');
                    vlessURL = Buffer.from(vlessURL).toString('base64');
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    console.log(`返回Base64编码内容，长度: ${vlessURL.length} 字符`);
                    res.end(vlessURL);
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    console.log(`返回普通文本内容，${domainList.length} 个URL`);
                    res.end(vlessURL + '\n');
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Not Found\n');
            }
        } catch (error) {
            console.error('处理HTTP请求时出错:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Internal Server Error\n');
        }
    });

    httpServer.listen(PORT, () => {
        console.log(`HTTP Server is running on port ${PORT}`);
    });

    const wss = new WebSocket.Server({ server: httpServer });
    const uuid = UUID.replace(/-/g, "");
    wss.on('connection', ws => {
        ws.once('message', msg => {
            const [VERSION] = msg;
            const id = msg.slice(1, 17);
            if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return;
            let i = msg.slice(17, 18).readUInt8() + 19;
            const port = msg.slice(i, i += 2).readUInt16BE(0);
            const ATYP = msg.slice(i, i += 1).readUInt8();
            const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') :
                (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
                    (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
            ws.send(new Uint8Array([VERSION, 0]));
            const duplex = createWebSocketStream(ws);
            net.connect({ host, port }, function () {
                this.write(msg.slice(i));
                duplex.on('error', () => { }).pipe(this).on('error', () => { }).pipe(duplex);
            }).on('error', () => { });
        }).on('error', () => { });
    });

    downloadFiles();
}

function getSystemArchitecture() {
    const arch = os.arch();
    if (arch === 'arm' || arch === 'arm64') {
        return 'arm';
    } else {
        return 'amd';
    }
}

function downloadFile(fileName, fileUrl, callback) {
    const filePath = path.join("./", fileName);
    const writer = fs.createWriteStream(filePath);
    axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream',
    })
        .then(response => {
            response.data.pipe(writer);
            writer.on('finish', function () {
                writer.close();
                callback(null, fileName);
            });
        })
        .catch(error => {
            callback(`Download ${fileName} failed: ${error.message}`);
        });
}

function downloadFiles() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        console.log(`Can't find a file for the current architecture`);
        return;
    }

    let downloadedCount = 0;

    filesToDownload.forEach(fileInfo => {
        downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
            if (err) {
                console.log(`Download ${fileName} failed`);
            } else {
                console.log(`Download ${fileName} successfully`);

                downloadedCount++;

                if (downloadedCount === filesToDownload.length) {
                    setTimeout(() => {
                        authorizeFiles();
                    }, 3000);
                }
            }
        });
    });
}

function getFilesForArchitecture(architecture) {
    if (architecture === 'arm') {
        return [
            { fileName: "npm", fileUrl: "https://github.com/yonggekkk/vless-nodejs/releases/download/vlnodejs/js_arm" },
        ];
    } else if (architecture === 'amd') {
        return [
            { fileName: "npm", fileUrl: "https://github.com/yonggekkk/vless-nodejs/releases/download/vlnodejs/js_amd" },
        ];
    }
    return [];
}

function authorizeFiles() {
    const filePath = './npm';
    const newPermissions = 0o775;
    fs.chmod(filePath, newPermissions, (err) => {
        if (err) {
            console.error(`Empowerment failed:${err}`);
        } else {
            console.log(`Empowerment success:${newPermissions.toString(8)} (${newPermissions.toString(10)})`);

            if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
                let NEZHA_TLS = (NEZHA_PORT === '443') ? '--tls' : '';
                const command = `./npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --skip-conn --disable-auto-update --skip-procs --report-delay 4 >/dev/null 2>&1 &`;
                try {
                    exec(command);
                    console.log('npm is running');
                } catch (error) {
                    console.error(`npm running error: ${error}`);
                }
            } else {
                console.log('skip running');
            }
        }
    });
}

// 添加从API获取IP的函数
async function fetchApiData() {
    const apiList = [
        {
            url: 'https://ipdb.api.030101.xyz/?type=bestcf&country=true',
            namePrefix: '优选官方API(1-'
        },
        {
            url: 'https://addressesapi.090227.xyz/CloudFlareYes',
            namePrefix: '优选官方API(2-'
        },
        {
            url: 'https://addressesapi.090227.xyz/ip.164746.xyz',
            namePrefix: '优选官方API(3-'
        },
        {
            url: 'https://ipdb.api.030101.xyz/?type=bestproxy&country=true',
            namePrefix: '优选反代API(1-'
        }
    ];

    let allResults = [];

    try {
        // 逐个处理API，而不是并行请求
        for (let apiIndex = 0; apiIndex < apiList.length; apiIndex++) {
            const api = apiList[apiIndex];
            console.log(`正在请求 API: ${api.url}`);
            
            try {
                const response = await axios.get(api.url, {
                    timeout: 8000, // 增加超时时间
                    validateStatus: function (status) {
                        return status >= 200 && status < 300;
                    }
                });
                
                if (response.data) {
                    let ipList;
                    if (typeof response.data === 'string') {
                        // 将返回的数据按行分割
                        ipList = response.data.trim().split(/[\r\n]+/);
                        console.log(`API ${api.url} 返回 ${ipList.length} 个IP`);
                    } else {
                        console.error(`API返回的数据不是字符串:`, response.data);
                        ipList = [];
                    }

                    // 为每个IP创建一个对象，包含域名和名称
                    ipList.forEach((item, index) => {
                        const ipParts = item.split('#');
                        const ip = ipParts[0].trim();
                        if (ip) {
                            const nameIndex = index + 1;
                            let name = `${api.namePrefix}${nameIndex})`;
                            
                            // 如果IP后面有额外信息（#后面的部分），添加到名称中
                            if (ipParts.length > 1) {
                                name += `-${ipParts[1]}`;
                            }
                            
                            allResults.push({ domain: ip, name: name });
                            // 添加确认日志
                            console.log(`添加IP: ${ip} 名称: ${name}`);
                        }
                    });
                }
            } catch (error) {
                console.error(`获取 ${api.url} 失败: ${error.message}`);
            }
        }

        console.log(`总共获取到 ${allResults.length} 个API IP`);
        return allResults;
    } catch (error) {
        console.error('获取API数据时出错:', error.message);
        return []; // 出错时返回空数组
    }
}

main();
