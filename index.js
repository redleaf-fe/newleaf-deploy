const fs = require("fs-extra");
const path = require("path");
const redis = require("redis");
const axios = require("axios");
const AdmZip = require("adm-zip");

const config = require("./env.json");
const redisKey = require("./redisKey");

function deploy({ publishId, commit, appName, distPath }) {
  const zipFilePath = path.resolve(
    config.appDir,
    `${appName}-${commit}-dist-nomap.zip`
  );
  const extractFilePath = path.resolve(
    config.appDir,
    `${appName}-${commit}-dist-nomap`
  );
  axios({
    url: `${config.centerServer}/publish/getShouldPublish`,
    method: "post",
    headers: { "Content-Type": "application/json" },
    data: {
      address: `${config.deployAddress}:${config.appDir}`,
      id: publishId,
    },
  })
    .then((res) => {
      if (+res.data.id === +publishId) {
        if (!fs.existsSync(zipFilePath)) {
          return;
        }
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(extractFilePath, true);
        fs.removeSync(distPath);
        fs.copySync(extractFilePath, distPath);

        axios({
          url: `${config.centerServer}/publish/publishResult`,
          method: "post",
          headers: { "Content-Type": "application/json" },
          data: {
            address: `${config.deployAddress}:${config.appDir}`,
            id: publishId,
          },
        }).catch((e) => {
          fs.writeFileSync(
            path.resolve(config.appDir, `${appName}-${commit}.log`),
            JSON.stringify(e),
            { flag: "a" }
          );
        });
      }
    })
    .catch((e) => {
      fs.writeFileSync(
        path.resolve(config.appDir, `${appName}-${commit}.log`),
        JSON.stringify(e),
        { flag: "a" }
      );
    });
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

  client.subscribe(redisKey.deployChannel);

  client.on("message", function (channel, value) {
    if (channel !== redisKey.deployChannel) {
      return;
    }
    const val = JSON.parse(value);
    const { publishId, appId, commit, appName } = val || {};

    // 确认是否是自己负责的应用
    if (+appId !== +config.appId) {
      return;
    }

    deploy({ publishId, commit, appName, distPath });
  });
}

main();
