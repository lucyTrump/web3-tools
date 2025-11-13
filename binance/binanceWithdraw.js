require("dotenv").config(); // 用于加载环境变量
const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");

// 从环境变量获取 API 密钥
const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;
const BASE_URL = "https://api.binance.com";

// 生成签名
function generateSignature(queryString, apiSecret) {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

async function withdraw(coin, address, amount, network = null) {
  try {
    // 构造请求参数
    const params = {
      coin, // 提币币种，例如 'USDT'
      address, // 提币地址
      amount, // 提币数量
      timestamp: Date.now(),
    };
    console.log("params ", params);

    // 如果指定了网络（如 ERC20, TRC20），添加到参数
    if (network) {
      params.network = network;
    }

    // 构造查询字符串
    const queryString = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");

    console.log("请求参数:", queryString);

    // 生成签名
    const signature = generateSignature(queryString, API_SECRET);
    const signedQueryString = `${queryString}&signature=${signature}`;

    // 发送提币请求
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/sapi/v1/capital/withdraw/apply`,
      headers: {
        "X-MBX-APIKEY": API_KEY,
      },
      data: signedQueryString,
    });

    console.log("提币请求成功:", response.data);
    return response.data;
  } catch (error) {
    console.error("提币请求失败:", error.response ? error.response.data : error.message);
    throw error;
  }
}

// 读取提币历史文件
function readWithdrawHistoryFile() {
  try {
    // const data = fs.readFileSync(path.join(__dirname, "./addr.txt"), "utf8");
    const data = fs.readFileSync(path.join(__dirname, "./arbitrum.txt"), "utf8");
    const addressArray = data
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((item) => item.trim().split(",")); // 去除每行的前后空格
    return addressArray;
  } catch (err) {
    console.error("读取文件出错:", err);
  }
}

// 示例调用
(async () => {
  try {
    // 示例：提币 10 USDT 到指定地址，使用 TRC20 网络
    const addressesList = readWithdrawHistoryFile();
    let index = 0;
    for (const item of addressesList) {
      const [address, amount] = item;
      console.log(index, `正在提币到地址: `, address, `金额:`, amount);
      index++;
      // sol 提币
      // await withdraw("SOL", address, amount, "SOL");

      // arbitrum 链 USDC
      // const Fees = 0.17; // bn 提币手续费 0.17
      // await withdraw("USDC", address, Number(Number(amount) + Fees).toFixed(2), "ARBITRUM");

      // arbitrum 链 ETH
      // const Fees = 0;
      // await withdraw("ETH", address, Number(Number(amount) + Fees), "ARBITRUM");
      // console.log(`提币到地址 ${address} 成功！`);

      // arbitrum 链 ETH
      const Fees = 0;
      await withdraw("ETH", address, Number(Number(amount) + Fees), "ETH");
      console.log(`提币到地址 ${address} 成功！`);
      // // 等待 1.5 秒以避免请求过于频繁
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  } catch (error) {
    console.error("错误:", error.response?.data);
  }
})();
