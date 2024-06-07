const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  // const StakingToken = await hre.ethers.getContractFactory("StakingToken");
  // const stakingToken = await StakingToken.deploy();
  // await stakingToken.deployed();
  
  // const stakingTokenAddress = stakingToken.address;
  // const stakingTokenAddress = '0x66922DB5Ff78A42c2E679F061DF5D16823828b4A'; // NMX
  
  // console.log("Token deployed to:", stakingTokenAddress);

  const Farming = await hre.ethers.getContractFactory("Farming");
  const farming = await Farming.deploy(
    100,  // MAX
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
    '0xdFB9cAb9f44355963588bc26b9633996Ce8c0D80', // NMX-USDC
    '0x10298Be5Abf74D111D133dc3493Dc4C6a9FD924b', // NMX-USDC Staking Service
    '0xd486d0846812266d21e1ab6c57fcf202df836dc8' // Liquidity Service
  );
  // const stakingBridge = await StakingBridge.deploy('0x971Ba0aBF64DbffCFF6f41ba3874bFb8E067F221', '0x8e9916E8Af0DF22B1D364C08753d86F5B8004560');
  await farming.deployed();
  console.log("Farming deployed to:", farming.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });