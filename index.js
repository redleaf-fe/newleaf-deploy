const redis = require("redis");
const axios = require("axios");

const { redisPromisify, IPAddr } = require("./utils");
const config = require("./env.json");
const redisKey = require("./redisKey");

function main() {
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
    const { publishId, appId } = val || {};

    // 确认是否是自己负责的应用
    if (+appId !== +config.appId) {
      return;
    }
    const res = await axios({
      url: `${config.centerServer}/publish/getShouldPublish`,
      method: "get",
      headers: { "Content-Type": "application/json" },
      data: {
        ip: IPAddr,
        id: publishId,
      },
    });

    // if (res.shouldPub) {
    //   await 
    // }
  });
}

main();
