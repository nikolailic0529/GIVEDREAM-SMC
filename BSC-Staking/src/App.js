import './App.css';
import { useState } from 'react';
import { BigNumber, ethers } from 'ethers'

import Farming from './artifacts/contracts/Farming.sol/Farming.json'
import WrappedTON from './artifacts/contracts/Farming.sol/WrappedTON.json'
import NomiswapStakingService from './artifacts/contracts/Farming.sol/NomiswapStakingService.json'

const TON_UNIT = Math.pow(10, 9);
const NMX_UNIT = Math.pow(10, 18);
const USDC_UNIT = Math.pow(10, 18);
const LP_UNIT = Math.pow(10, 18);

const FarmingAddress = "0xEEEed1734c671c494ABB45621980222CbA2F3409"
const NomiswapStakingServiceAddress = "0x10298Be5Abf74D111D133dc3493Dc4C6a9FD924b"
const TON = "0x76A797A59Ba2C17726896976B7B3747BfD1d220f"
const USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
const NMX = "0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65"
const LP = "0xdFB9cAb9f44355963588bc26b9633996Ce8c0D80"

function App() {
  const [userTonBalance, setUserTonBalance] = useState()
  const [farmingTonBalance, setFarmingTonBalance] = useState()
  const [farmingNmxBalance, setFarmingNmxBalance] = useState()
  const [farmingUsdcBalance, setFarmingUsdcBalance] = useState()
  const [farmingLPBalance, setFarmingLPBalance] = useState()
  const [sendingTonAmount, setSendingTonAmount] = useState(0)
  const [stakedAmount, setStakedAmount] = useState(0)

  async function requestAccount() {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  }

  async function getUserTonBalance() {
    if (typeof window.ethereum !== 'undefined') {
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(TON, WrappedTON.abi, provider)
      const balance = await contract.balanceOf(account);
      setUserTonBalance(balance / TON_UNIT);
    }
  }

  async function getFarmingTonBalance() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(TON, WrappedTON.abi, provider)
      const balance = await contract.balanceOf(FarmingAddress);
      setFarmingTonBalance(balance / TON_UNIT);
    }
  }

  async function getFarmingNmxBalance() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(NMX, WrappedTON.abi, provider)
      const balance = await contract.balanceOf(FarmingAddress);
      setFarmingNmxBalance(balance / NMX_UNIT);
    }
  }

  async function getFarmingUsdcBalance() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(USDC, WrappedTON.abi, provider)
      const balance = await contract.balanceOf(FarmingAddress);
      setFarmingUsdcBalance(balance / USDC_UNIT);
    }
  }

  async function getFarmingLPBalance() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(LP, WrappedTON.abi, provider)
      const balance = await contract.balanceOf(FarmingAddress);
      setFarmingLPBalance(balance / LP_UNIT);
    }
  }

  async function getStakedAmount() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(NomiswapStakingServiceAddress, NomiswapStakingService.abi, provider)
      const data = await contract.stakers(FarmingAddress);
      setStakedAmount(parseInt(data[0]._hex, 16) / LP_UNIT);
    }
  }

  async function get_amount_before_deposit() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(FarmingAddress, Farming.abi, provider)
      const data = await contract.get_amount_before_deposit();
      console.log('here', data);
    }
  }

  async function sendTontoFarming() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      
      try {
        let contract = new ethers.Contract(TON, WrappedTON.abi, signer)
        let transaction = await contract.transfer(FarmingAddress, Number(sendingTonAmount * TON_UNIT).toString())
        await transaction.wait()

        getUserTonBalance();
        getFarmingTonBalance();
      } catch (err) {
        console.log('Error', err);
        alert('Error' + err.reason)
      }
    }
  }

  async function swap_to_tokens() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      
      try {
        let contract = new ethers.Contract(FarmingAddress, Farming.abi, signer)
        let transaction = await contract.add_liquidity()
        await transaction.wait()

        getFarmingTonBalance();
        getFarmingNmxBalance();
        getFarmingUsdcBalance();
        getFarmingLPBalance();
        getStakedAmount();
      } catch (err) {
        console.log('Error', err);
        alert('Error' + err.reason)
      }
    }
  }

  async function add_liquidity() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      
      try {
        let contract = new ethers.Contract(FarmingAddress, Farming.abi, signer)
        let transaction = await contract.deposit()
        await transaction.wait()

        getFarmingNmxBalance();
        getFarmingUsdcBalance();
        getFarmingLPBalance();
      } catch (err) {
        console.log('Error', err);
        alert('Error' + err.reason)
      }
    }
  }

  async function stake_lp() {
    if (typeof window.ethereum !== 'undefined') {
      await requestAccount()
      const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner()
      
      try {
        // let contract = new ethers.Contract(LP, WrappedTON.abi, signer)
        // let transaction = await contract.approve("0x10298Be5Abf74D111D133dc3493Dc4C6a9FD924b", 0)
        let contract = new ethers.Contract(FarmingAddress, Farming.abi, signer)
        let transaction = await contract.stake()
        await transaction.wait()

        getFarmingLPBalance();
        getStakedAmount();
      } catch (err) {
        console.log('Error', err);
        alert('Error' + err.reason)
      }
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={getUserTonBalance}>Get User TON Balance</button>
        <input type="text" value={userTonBalance} disabled size="50" />
        <br/>
        
        <button onClick={sendTontoFarming}>Send TON to Farming Service</button>
        <input type="text" value={sendingTonAmount} onChange={(e) => (setSendingTonAmount(e.target.value))} disabled={!userTonBalance} size="50" />
        <br />
        
        <button onClick={getFarmingTonBalance}>Get FarmingService TON Balance</button>
        <input type="text" value={farmingTonBalance} disabled size="50" />
        
        <button onClick={getFarmingNmxBalance}>Get FarmingService NMX Balance</button>
        <input type="text" value={farmingNmxBalance} disabled size="50" />
        
        <button onClick={getFarmingUsdcBalance}>Get FarmingService USDC Balance</button>
        <input type="text" value={farmingUsdcBalance} disabled size="50" />

        <button onClick={getFarmingLPBalance}>Get FarmingService LP Token Balance</button>
        <input type="text" value={farmingLPBalance} disabled size="50" />

        <button onClick={getStakedAmount}>Get Staked Amount</button>
        <input type="text" value={stakedAmount} disabled size="50" />
        <br/>
        
        <button onClick={swap_to_tokens}>Swap to NMX and USDC</button>
        <br />
        
        <button onClick={add_liquidity}>Add Liquidity to Nomiswap</button>
        <br />

        <button onClick={stake_lp}>Stake LP Tokens to Nomiswap</button>

        {/* <button onClick={get_amount_before_deposit}>Get Amount Before Deposit</button>
        <br /> */}

      </header>
    </div>
  );
}

export default App;
