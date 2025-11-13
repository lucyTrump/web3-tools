// 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 USDC
const path = require("path");
const XLSX = require("xlsx");
const { ethers } = require("ethers"); // ethers v6 导入方式

// 配置：替换为你的Infura/Alchemy RPC URL
const RPC_URL = "https://eth.llamarpc.com"; // 替换为你的RPC URL
const provider = new ethers.JsonRpcProvider(RPC_URL);

// USDC合约地址（ETH主网）
const ERC20_CONTRACT_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// ERC20 ABI（balanceOf和transfer函数）
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
];

const contract = new ethers.Contract(ERC20_CONTRACT_ADDRESS, ERC20_ABI, provider);

// 读取Excel文件
function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

// 执行转账
async function transfer(prkey, toAddress) {
  try {
    // 从私钥创建钱包
    const wallet = new ethers.Wallet(prkey, provider);
    const fromAddress = wallet.address;

    // 查询USDC余额
    const balance = await contract.balanceOf(fromAddress);
    const balanceFormatted = ethers.formatUnits(balance, 6); // USDC有6位小数
    console.log(`地址 ${fromAddress} 的USDC余额: ${balanceFormatted} USDC`);

    console.log(`开始转账: 从 ${fromAddress} 到 ${toAddress}, 金额: ${balanceFormatted} USDC (全部余额)`);
    if (parseFloat(balanceFormatted) <= 0) {
      console.warn(`余额为0，跳过转账???`);
      return true; // 视为成功，继续下一笔
    }

    // 执行转账（ethers自动处理gas）
    const tx = await contract.connect(wallet).transfer(toAddress, balance);
    const receipt = await tx.wait();
    console.log(`转账成功: 交易哈希 ${receipt.hash}`);
    return true;
  } catch (error) {
    console.error(`转账失败: ${error.message}`);
    return false;
  }
}

// 主函数：顺序执行转账
async function main() {
  // 表头 prkey[私钥] btgaddr[to地址]
  const filePath = path.join(__dirname, "ads.xlsx");
  const data = readExcel(filePath);

  console.log(`读取到 ${data.length} 条记录`);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const prkey = row.prkey; // 私钥（注意：私钥应以0x开头）
    const toAddress = row.btgaddr; // to地址

    if (!prkey || !toAddress) {
      console.warn(`跳过第 ${i + 1} 行: 缺少私钥或地址`);
      continue;
    }

    // 等待前一笔完成（顺序执行）
    const success = await transfer(prkey, toAddress);
    if (!success) {
      console.error(`第 ${i + 1} 笔转账失败，停止执行`);
      break;
    }

    // 可选：添加延迟，避免RPC限速
    // await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("所有转账执行完毕");
}

// 运行
main().catch(console.error);
