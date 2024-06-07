import '@twa-dev/sdk';
import './App.css';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useTonConnect } from './hooks/useTonConnect';
import { useCounterContract } from './hooks/useCounterContract';
import { useNominatorPoolContract } from './hooks/useNominatorPoolContract';
import { useState } from 'react';

function App() {
  const { connected } = useTonConnect();
  const { value, address: counterAddress, sendIncrement } = useCounterContract();
  // const { address, poolBalance, stakingAmount, deposit, withdraw } = useNominatorPoolContract();
  // const [amount, setAmount] = useState(0);

  return (
    <div className='App'>
      <div className='Container'>
        <TonConnectButton />

        <div className='Card'>
          <b>Counter Address</b>
          <div className='Hint'>{counterAddress?.slice(0, 30) + '...'}</div>
        </div>

        <div className='Card'>
          <b>Counter Value</b>
          <div>{value ?? 'Loading...'}</div>
        </div>

        <a
          className={`Button ${connected ? 'Active' : 'Disabled'}`}
          onClick={() => {
            sendIncrement();
          }}
        >
          Increment
        </a>

        {/* <div className='Card'>
          <b>Nominator Pool Address</b>
          <div className='Hint'>{address?.slice(0, 30) + '...'}</div>
        </div>

        <div className='Card'>
          <b>Pool Balance</b>
          <div>{poolBalance ?? 'Loading...'}</div>
        </div>

        <div className='Card'>
          <b>Staking Amount</b>
          <div>{stakingAmount ?? 'Loading...'}</div>
        </div>

        <div className='Card'>
          <b>Input Amount</b>
          <br/>
          <input type="number" value={amount} onChange={(e: Event) => setAmount(e.target.value)} style={{width: '80px'}} />
        </div>

        <a
          className={`Button ${connected ? 'Active' : 'Disabled'}`}
          onClick={() => {
            deposit(amount);
          }}
        >
          Deposit
        </a>

        <a
          className={`Button ${connected ? 'Active' : 'Disabled'}`}
          onClick={() => {
            withdraw(amount);
          }}
        >
          Withdraw
        </a> */}
      </div>
    </div>
  );
}

export default App
