const os = require("os");
const { promisify } = require("util");

function getIPAddress() {
  const interfaces = os.networkInterfaces();
  let address;
  Object.keys(interfaces).some((v) => {
    const iface = interfaces[v];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      ) {
        address = alias.address;
        return true;
      }
    }
    return false;
  });
  return address;
}

const IPAddr = getIPAddress();

module.exports = {
  // redis promisify
  redisPromisify(client) {
    client.existsAsync = promisify(client.exists).bind(client);
    client.getAsync = promisify(client.get).bind(client);
    client.setAsync = promisify(client.set).bind(client);
    client.mgetAsync = promisify(client.mget).bind(client);
    client.hsetAsync = promisify(client.hset).bind(client);
    client.hgetallAsync = promisify(client.hgetall).bind(client);
  },
  // 本机ip
  IPAddr,
};
