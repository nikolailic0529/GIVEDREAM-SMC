// import { task } from 'hardhat/config';
// import 'solidity-coverage';
// import '@nomiclabs/hardhat-waffle';
// import '@typechain/hardhat';
// import '@nomiclabs/hardhat-ethers';
// import "hardhat-gas-reporter"
require("@nomicfoundation/hardhat-toolbox");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.13",
    settings: {
      evmVersion: "constantinople",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: true
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: ['a55df84c385ed04c14e42f154aaccfb3700eea67824b7f111e0cb149d93715aa']
    },
    bsctestnet: {
      network_id: "97",
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: ['a55df84c385ed04c14e42f154aaccfb3700eea67824b7f111e0cb149d93715aa']
    },
    bscmainnet: {
      network_id: "56",
      url: "https://bsc-dataseed4.ninicoin.io/",
      accounts: ['a55df84c385ed04c14e42f154aaccfb3700eea67824b7f111e0cb149d93715aa']
    },
  },
};