const fs = require("fs-extra");
const path = require("path");
const redis = require("redis");
const axios = require("axios");
const AdmZip = require("adm-zip");

const { redisPromisify } = require("./utils");
const config = require("./env.json");
const redisKey = require("./redisKey");

async function deploy({ publishId, commit, appName, distPath }) {
  const zipFilePath = path.resolve(
    config.appDir,
    `${appName}-${commit}-dist-nomap.zip`
  );
  const extractFilePath = path.resolve(
    config.appDir,
    `${appName}-${commit}-dist-nomap`
  );
  const res = await axios({
    url: `${config.centerServer}/publish/getShouldPublish`,
    method: "get",
    headers: { "Content-Type": "application/json" },
    data: {
      address: config.deployAddress,
      id: publishId,
    },
  });

  if (res.shouldPub) {
    if (!fs.existsSync(zipFilePath)) {
      return;
    }
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(extractFilePath, true);
    fs.removeSync(distPath);
    fs.copySync(extractFilePath, distPath);

    axios({
      url: `${config.centerServer}/publish/publishResult`,
      method: "get",
      headers: { "Content-Type": "application/json" },
      data: {
        address: config.deployAddress,
        id: publishId,
      },
    });
  }
}

function main() {
  const distPath = path.resolve(config.appDir, "dist");

  if (fs.existsSync(config.appDir)) {
    fs.mkdirSync(config.appDir, { recursive: true });
  }

  const client = redis.createClient({
    host: config.redisHost,
    port: config.redisPort,
  });
  redisPromisify(client);

  client.subscribe(redisKey.deployChannel);

  client.on("message", async function (channel, value) {
    if (channel !== redisKey.deployChannel) {
      return;
    }
    const val = JSON.parse(value);
    const { publishId, appId, commit, appName } = val || {};

    // 确认是否是自己负责的应用
    if (+appId !== +config.appId) {
      return;
    }

    await deploy({ publishId, commit, appName, distPath });
  });
}

main();
